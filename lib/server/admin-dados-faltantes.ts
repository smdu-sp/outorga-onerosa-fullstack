/**
 * Listagem e preenchimento de processos com dados faltantes (admin).
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import {
	buscarCategoriasPorProcessoNoBi,
	buscarCategoriasPorProtocoloAdNoBi,
	classificarTipologiaUsoDeCategorias,
	descricaoCategoriaBi,
	processoExisteNoBi,
	ehTipologiaUsoCanonica,
	normalizarTipologiaUsoOodc,
} from '@/lib/server/bi-categoria';
import { consultarGeoSampa, GeoSampaConsultaError } from '@/lib/server/geosampa';
import { salvarDadosGeoSampaNoProcesso } from '@/lib/server/monitoramento';
import { sincronizarSqlsDoProcessoComBi } from '@/lib/server/processo-sqls';
import {
	descricaoProtocoloAd,
	limparProtocoloAd,
	normalizarProtocoloAd,
} from '@/lib/server/protocolo-ad';
import { mascararNumeroProcesso, seiComDigitoInvalido } from '@/lib/mascara-processo';

export type CampoFaltante = 'categoria_uso';

export type ProcessoDadoFaltante = {
	id: string;
	num_processo: string;
	tipo: string | null;
	interessado: string | null;
	status_pagamento: string;
	origem: string | null;
	data_entrada: string | null;
	temFicha: boolean;
	temEnquadramento: boolean;
	tipologiaAtual: string | null;
	motivo: 'sem_ficha' | 'sem_enquadramento' | 'sem_categoria';
	/** Número SEI de 16 dígitos com dígito verificador que não confere (cadastrado errado). */
	seiInvalido: boolean;
};

export type ResultadoPesquisaApi = {
	processoId: string;
	num_processo: string;
	tipologiaSugerida: 'R' | 'nR' | 'R/nR' | null;
	fonte: 'bi' | 'geosampa' | 'bi+geosampa' | null;
	/** Processo/protocolo localizado no BI (null = consulta ao BI falhou). */
	encontradoBi: boolean | null;
	detalheBi: string | null;
	detalheGeosampa: string | null;
	erro: string | null;
	podeAplicar: boolean;
};

export async function listarProcessosSemCategoriaUso(): Promise<ProcessoDadoFaltante[]> {
	const processos = await prisma.processo.findMany({
		select: {
			id: true,
			num_processo: true,
			tipo: true,
			interessado: true,
			status_pagamento: true,
			origem: true,
			data_entrada: true,
			monitoramento: {
				select: {
					id: true,
					enquadramento_urbanistico: {
						select: { id: true, tipologia_uso_oodc: true },
					},
				},
			},
		},
		orderBy: { num_processo: 'asc' },
	});

	const faltantes: ProcessoDadoFaltante[] = [];

	for (const p of processos) {
		const tip = p.monitoramento?.enquadramento_urbanistico?.tipologia_uso_oodc?.trim() || null;
		const temFicha = Boolean(p.monitoramento);
		const temEnquadramento = Boolean(p.monitoramento?.enquadramento_urbanistico);

		let motivo: ProcessoDadoFaltante['motivo'] | null = null;
		if (!temFicha) motivo = 'sem_ficha';
		else if (!temEnquadramento) motivo = 'sem_enquadramento';
		else if (!tip || !ehTipologiaUsoCanonica(tip)) motivo = 'sem_categoria';

		if (!motivo) continue;

		faltantes.push({
			id: p.id,
			num_processo: mascararNumeroProcesso(p.num_processo),
			tipo: p.tipo,
			interessado: p.interessado,
			status_pagamento: p.status_pagamento,
			origem: p.origem,
			data_entrada: p.data_entrada
				? p.data_entrada.toISOString().slice(0, 10)
				: null,
			temFicha,
			temEnquadramento,
			tipologiaAtual: tip,
			motivo,
			seiInvalido: seiComDigitoInvalido(p.num_processo),
		});
	}

	return faltantes;
}

export async function pesquisarCategoriaUsoNasApis(
	processoIds: string[],
): Promise<ResultadoPesquisaApi[]> {
	const ids = [...new Set(processoIds)].slice(0, 100);
	const processos = await prisma.processo.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			num_processo: true,
			protocolo_ad: true,
			monitoramento: {
				select: { enquadramento_urbanistico: { select: { id: true } } },
			},
		},
	});

	const resultados: ResultadoPesquisaApi[] = [];

	for (const p of processos) {
		let tipologiaBi: 'R' | 'nR' | 'R/nR' | null = null;
		let detalheBi: string | null = null;
		let encontradoBi: boolean | null = null;
		let tipologiaGeo: 'R' | 'nR' | 'R/nR' | null = null;
		let detalheGeosampa: string | null = null;
		let erro: string | null = null;

		try {
			// Preferência: protocolo AD (coluna BI `protocolo`, com normalização #/letras)
			// → fallback número do processo (coluna BI `processo`)
			const protocolo = limparProtocoloAd(p.protocolo_ad);
			let cats: Awaited<ReturnType<typeof buscarCategoriasPorProcessoNoBi>> = [];
			if (protocolo) {
				cats = await buscarCategoriasPorProtocoloAdNoBi(protocolo);
			}
			if (!cats.length) {
				cats = await buscarCategoriasPorProcessoNoBi(mascararNumeroProcesso(p.num_processo));
			}
			tipologiaBi = classificarTipologiaUsoDeCategorias(cats);
			encontradoBi = cats.length > 0 || (await processoExisteNoBi(p.num_processo));
			if (cats.length) {
				detalheBi = cats.map(descricaoCategoriaBi).join(' · ');
			} else if (encontradoBi) {
				detalheBi = 'no BI, mas sem categoria com área computável (ex.: Sisacoe)';
			}
		} catch (e) {
			erro = e instanceof Error ? e.message : 'Erro no BI';
		}

		if (!tipologiaBi) {
			try {
				const geo = await consultarGeoSampa(undefined, mascararNumeroProcesso(p.num_processo), () => {});
				const raw =
					geo.data.enquadramento_urbanistico?.tipologia_uso_oodc ??
					geo.data.enquadramento_urbanistico?.uso ??
					null;
				tipologiaGeo = normalizarTipologiaUsoOodc(raw);
				detalheGeosampa = raw?.trim() || null;
			} catch (e) {
				if (!(e instanceof GeoSampaConsultaError)) {
					erro = [erro, e instanceof Error ? e.message : 'Erro no GeoSampa']
						.filter(Boolean)
						.join(' | ');
				} else if (!erro) {
					erro = e.message;
				}
			}
		}

		const usos = new Set<'R' | 'nR'>();
		for (const src of [tipologiaBi, tipologiaGeo]) {
			if (src === 'R/nR') {
				usos.add('R');
				usos.add('nR');
			} else if (src === 'R' || src === 'nR') {
				usos.add(src);
			}
		}
		const sugerida =
			usos.has('R') && usos.has('nR')
				? 'R/nR'
				: usos.has('R')
					? 'R'
					: usos.has('nR')
						? 'nR'
						: null;

		const fonte: ResultadoPesquisaApi['fonte'] = !sugerida
			? null
			: tipologiaBi && tipologiaGeo
				? 'bi+geosampa'
				: tipologiaBi
					? 'bi'
					: 'geosampa';

		resultados.push({
			processoId: p.id,
			num_processo: mascararNumeroProcesso(p.num_processo),
			tipologiaSugerida: sugerida,
			fonte,
			encontradoBi,
			detalheBi,
			detalheGeosampa,
			erro: sugerida ? null : erro,
			podeAplicar: Boolean(sugerida && p.monitoramento?.enquadramento_urbanistico),
		});
	}

	await salvarConsultas(
		resultados.map((r) => ({
			processoId: r.processoId,
			tipoConsulta: 'PESQUISA' as const,
			status: r.tipologiaSugerida
				? ('ENCONTRADO' as const)
				: r.erro
					? ('ERRO' as const)
					: ('NAO_ENCONTRADO' as const),
			fonte: r.fonte,
			encontradoBi: r.encontradoBi,
			sql: null,
			tipologia: r.tipologiaSugerida,
			detalhe:
				[r.erro, r.detalheBi && `BI: ${r.detalheBi}`, r.detalheGeosampa && `Geo: ${r.detalheGeosampa}`]
					.filter(Boolean)
					.join(' · ') || null,
		})),
	);

	return resultados;
}

export async function aplicarCategoriaUsoSugerida(
	itens: { processoId: string; tipologia: 'R' | 'nR' | 'R/nR' }[],
): Promise<{ aplicados: number; ignorados: number }> {
	let aplicados = 0;
	let ignorados = 0;

	for (const item of itens) {
		const ficha = await prisma.monitoramentoFicha.findUnique({
			where: { processo_id: item.processoId },
			select: {
				enquadramento_urbanistico: { select: { id: true } },
			},
		});
		const enqId = ficha?.enquadramento_urbanistico?.id;
		if (!enqId) {
			ignorados++;
			continue;
		}
		await prisma.monitoramentoEnquadramentoUrbanistico.update({
			where: { id: enqId },
			data: { tipologia_uso_oodc: item.tipologia },
		});
		aplicados++;
	}

	return { aplicados, ignorados };
}

export type ProcessoSeiComProtocoloAd = {
	id: string;
	num_processo: string;
	protocolo_ad: string;
	/** Núcleo normalizado (`33287-23`) para match com o BI. */
	protocoloNucleo: string | null;
	origem: string | null;
	tipo: string | null;
	interessado: string | null;
	status_pagamento: string;
	tipologiaLocal: 'R' | 'nR' | 'R/nR' | null;
	tipologiaLocalRaw: string | null;
	temEnquadramento: boolean;
};

export type StatusComparacaoSeiBi =
	| 'igual'
	| 'divergente'
	| 'sem_bi'
	| 'sem_local'
	| 'erro';

export type ResultadoComparacaoSeiBi = {
	processoId: string;
	num_processo: string;
	protocolo_ad: string;
	protocoloNucleo: string | null;
	tipologiaLocal: 'R' | 'nR' | 'R/nR' | null;
	tipologiaBi: 'R' | 'nR' | 'R/nR' | null;
	detalheBi: string | null;
	status: StatusComparacaoSeiBi;
	erro: string | null;
	podeAplicar: boolean;
};

/**
 * Processos com protocolo AD — cruzamento com BI pela coluna `protocolo`
 * (não só origem SEI: AD/Portal também gravam o número SEI em `num_processo`).
 */
export async function listarProcessosSeiComProtocoloAd(): Promise<
	ProcessoSeiComProtocoloAd[]
> {
	const processos = await prisma.processo.findMany({
		where: {
			protocolo_ad: { not: null },
		},
		select: {
			id: true,
			num_processo: true,
			protocolo_ad: true,
			origem: true,
			tipo: true,
			interessado: true,
			status_pagamento: true,
			monitoramento: {
				select: {
					enquadramento_urbanistico: {
						select: { id: true, tipologia_uso_oodc: true },
					},
				},
			},
		},
		orderBy: { num_processo: 'asc' },
	});

	const lista: ProcessoSeiComProtocoloAd[] = [];
	for (const p of processos) {
		const norm = normalizarProtocoloAd(p.protocolo_ad);
		if (!norm) continue;
		const raw = p.monitoramento?.enquadramento_urbanistico?.tipologia_uso_oodc ?? null;
		lista.push({
			id: p.id,
			num_processo: mascararNumeroProcesso(p.num_processo),
			protocolo_ad: p.protocolo_ad?.replace(/\s+/g, ' ').trim() || norm.limpo,
			protocoloNucleo: norm.nucleo,
			origem: p.origem,
			tipo: p.tipo,
			interessado: p.interessado,
			status_pagamento: p.status_pagamento,
			tipologiaLocal: normalizarTipologiaUsoOodc(raw),
			tipologiaLocalRaw: raw?.trim() || null,
			temEnquadramento: Boolean(p.monitoramento?.enquadramento_urbanistico),
		});
	}
	return lista;
}

/**
 * Compara tipologia local com o BI buscando por protocolo AD normalizado
 * (`#33287-23` ≡ `33287-23-SP-ALV`). Máx. 100 por chamada.
 */
export async function compararSeiComBiPorProtocoloAd(
	processoIds: string[],
): Promise<ResultadoComparacaoSeiBi[]> {
	const ids = [...new Set(processoIds)].slice(0, 100);
	const processos = await prisma.processo.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			num_processo: true,
			protocolo_ad: true,
			monitoramento: {
				select: {
					enquadramento_urbanistico: {
						select: { id: true, tipologia_uso_oodc: true },
					},
				},
			},
		},
	});

	const resultados: ResultadoComparacaoSeiBi[] = [];

	for (const p of processos) {
		const norm = normalizarProtocoloAd(p.protocolo_ad);
		const rawLocal = p.monitoramento?.enquadramento_urbanistico?.tipologia_uso_oodc ?? null;
		const tipologiaLocal = normalizarTipologiaUsoOodc(rawLocal);
		const temEnq = Boolean(p.monitoramento?.enquadramento_urbanistico);
		const protocoloExibicao =
			p.protocolo_ad?.replace(/\s+/g, ' ').trim() || norm?.limpo || '';

		if (!norm) {
			resultados.push({
				processoId: p.id,
				num_processo: mascararNumeroProcesso(p.num_processo),
				protocolo_ad: protocoloExibicao,
				protocoloNucleo: null,
				tipologiaLocal,
				tipologiaBi: null,
				detalheBi: null,
				status: 'erro',
				erro: 'Sem protocolo AD',
				podeAplicar: false,
			});
			continue;
		}

		let tipologiaBi: 'R' | 'nR' | 'R/nR' | null = null;
		let detalheBi: string | null = null;
		let erro: string | null = null;

		try {
			const cats = await buscarCategoriasPorProtocoloAdNoBi(norm.limpo);
			tipologiaBi = classificarTipologiaUsoDeCategorias(cats);
			if (cats.length) {
				detalheBi = cats.map(descricaoCategoriaBi).join(' · ');
			}
		} catch (e) {
			erro = e instanceof Error ? e.message : 'Erro no BI';
		}

		let status: StatusComparacaoSeiBi;
		if (erro) status = 'erro';
		else if (!tipologiaBi) status = 'sem_bi';
		else if (!tipologiaLocal) status = 'sem_local';
		else if (tipologiaLocal === tipologiaBi) status = 'igual';
		else status = 'divergente';

		resultados.push({
			processoId: p.id,
			num_processo: mascararNumeroProcesso(p.num_processo),
			protocolo_ad: protocoloExibicao,
			protocoloNucleo: norm.nucleo,
			tipologiaLocal,
			tipologiaBi,
			detalheBi: detalheBi
				? detalheBi
				: norm.nucleo
					? `Busca: ${descricaoProtocoloAd(norm)}`
					: null,
			status,
			erro,
			podeAplicar: Boolean(tipologiaBi && temEnq && status !== 'igual'),
		});
	}

	return resultados;
}

export type ResultadoBackfillBiGeosampa = {
	processoId: string;
	num_processo: string;
	status: 'atualizado' | 'nao_encontrado' | 'erro';
	/** Origem dos dados gravados. */
	fonte: 'bi+geosampa' | 'geosampa' | 'bi' | null;
	sql: string | null;
	tipologiaAplicada: 'R' | 'nR' | 'R/nR' | null;
	detalhe: string | null;
};

const BACKFILL_MAX = 50;
/** Processos consultados ao mesmo tempo no backfill. */
const BACKFILL_CONCORRENCIA = 3;

/**
 * Backfill completo: consulta BI (SQL + categorias + licenças via fluxo GeoSampa)
 * e GeoSampa quando o BI não resolve o lote; grava ficha de monitoramento,
 * `sql_incra`/`sql_formatado` e tipologia (preferindo BI).
 */
export async function backfillProcessosDoBiGeosampa(
	processoIds: string[],
): Promise<ResultadoBackfillBiGeosampa[]> {
	const ids = [...new Set(processoIds)].slice(0, BACKFILL_MAX);
	const processos = await prisma.processo.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			num_processo: true,
			protocolo_ad: true,
			interessado: true,
			monitoramento: {
				select: { enquadramento_urbanistico: { select: { id: true } } },
			},
		},
	});
	const porId = new Map(processos.map((p) => [p.id, p]));

	/** Processa um processo; devolve o(s) resultado(s) dele (sempre 1 na prática). */
	const processarUm = async (id: string): Promise<ResultadoBackfillBiGeosampa[]> => {
		const resultados: ResultadoBackfillBiGeosampa[] = [];
		const p = porId.get(id);
		if (!p) {
			resultados.push({
				processoId: id,
				num_processo: '?',
				status: 'erro',
				fonte: null,
				sql: null,
				tipologiaAplicada: null,
				detalhe: 'Processo não encontrado.',
			});
			return resultados;
		}

		let tipologiaBi: 'R' | 'nR' | 'R/nR' | null = null;
		let detalheBi: string | null = null;

		try {
			const protocolo = limparProtocoloAd(p.protocolo_ad);
			let cats: Awaited<ReturnType<typeof buscarCategoriasPorProcessoNoBi>> = [];
			if (protocolo) {
				cats = await buscarCategoriasPorProtocoloAdNoBi(protocolo);
			}
			if (!cats.length) {
				cats = await buscarCategoriasPorProcessoNoBi(mascararNumeroProcesso(p.num_processo));
			}
			tipologiaBi = classificarTipologiaUsoDeCategorias(cats);
			if (cats.length) {
				detalheBi = cats.map(descricaoCategoriaBi).join(' · ');
			}
		} catch {
			// BI categoria é complementar; segue com GeoSampa
		}

		try {
			const consulta = await consultarGeoSampa(undefined, mascararNumeroProcesso(p.num_processo), () => {});
			let data = consulta.data;

			// Grava sempre a tipologia canônica (R / nR / R/nR): BI preferido; senão
			// normaliza o valor cru do GeoSampa (`R2v/nR1` → `R/nR`).
			const tipologiaCanonica =
				tipologiaBi ??
				normalizarTipologiaUsoOodc(
					data.enquadramento_urbanistico?.tipologia_uso_oodc ??
						data.enquadramento_urbanistico?.uso ??
						null,
				);
			if (tipologiaCanonica) {
				data = {
					...data,
					enquadramento_urbanistico: {
						...data.enquadramento_urbanistico,
						tipologia_uso_oodc: tipologiaCanonica,
					},
				};
			}

			await salvarDadosGeoSampaNoProcesso(
				p.id,
				consulta.modoSalvamento,
				consulta.identificadorSalvamento,
				data,
				{ apenasSqlPrincipal: true },
			);

			if (!p.interessado?.trim() && data.proprietario_interessado?.trim()) {
				await prisma.processo.update({
					where: { id: p.id },
					data: { interessado: data.proprietario_interessado.trim() },
				});
			}

			const tipGeo = normalizarTipologiaUsoOodc(
				data.enquadramento_urbanistico?.tipologia_uso_oodc ??
					data.enquadramento_urbanistico?.uso ??
					null,
			);
			const tipAplicada = tipologiaBi ?? tipGeo;
			const sql =
				data.sql_incra ??
				data.sql_formatado ??
				(consulta.modoSalvamento === 'SQL' ? consulta.identificadorSalvamento : null);

			const detalheApos = await prisma.processo.findUnique({
				where: { id: p.id },
				select: { _count: { select: { sqls: true } }, sql_incra: true },
			});
			const qtdSqls = detalheApos?._count.sqls ?? 0;

			resultados.push({
				processoId: p.id,
				num_processo: mascararNumeroProcesso(p.num_processo),
				status: 'atualizado',
				fonte: tipologiaBi ? 'bi+geosampa' : 'geosampa',
				sql: detalheApos?.sql_incra ?? sql,
				tipologiaAplicada: tipAplicada,
				detalhe: [
					qtdSqls > 1 ? `${qtdSqls} SQLs` : sql ? `SQL ${sql}` : null,
					detalheBi ? `BI: ${detalheBi}` : null,
				]
					.filter(Boolean)
					.join(' · ') || null,
			});
		} catch (e) {
			if (e instanceof GeoSampaConsultaError) {
				// Sem lote no GeoSampa — ainda grava todos os SQLs do BI e tipología se houver
				const sqlsBi = await sincronizarSqlsDoProcessoComBi(p.id, mascararNumeroProcesso(p.num_processo), {
					protocoloAd: p.protocolo_ad,
				});
				if (sqlsBi.length) {
					await prisma.processo.update({
						where: { id: p.id },
						data: {
							sql_incra: sqlsBi[0],
							sql_formatado: sqlsBi[0],
						},
					});
				}

				const enqId = p.monitoramento?.enquadramento_urbanistico?.id;
				if (tipologiaBi && enqId) {
					await prisma.monitoramentoEnquadramentoUrbanistico.update({
						where: { id: enqId },
						data: { tipologia_uso_oodc: tipologiaBi },
					});
					resultados.push({
						processoId: p.id,
						num_processo: mascararNumeroProcesso(p.num_processo),
						status: 'atualizado',
						fonte: 'bi',
						sql: sqlsBi[0] ?? null,
						tipologiaAplicada: tipologiaBi,
						detalhe: [
							`GeoSampa: ${e.message}`,
							sqlsBi.length ? `${sqlsBi.length} SQL(s) do BI` : null,
							detalheBi ? `Tipologia BI: ${detalheBi}` : null,
						]
							.filter(Boolean)
							.join(' · '),
					});
					return resultados;
				}

				if (sqlsBi.length) {
					resultados.push({
						processoId: p.id,
						num_processo: mascararNumeroProcesso(p.num_processo),
						status: 'atualizado',
						fonte: 'bi',
						sql: sqlsBi[0] ?? null,
						tipologiaAplicada: null,
						detalhe: [
							`GeoSampa: ${e.message}`,
							`${sqlsBi.length} SQL(s) do BI gravados`,
						].join(' · '),
					});
					return resultados;
				}

				resultados.push({
					processoId: p.id,
					num_processo: mascararNumeroProcesso(p.num_processo),
					status: 'nao_encontrado',
					fonte: null,
					sql: null,
					tipologiaAplicada: null,
					detalhe: e.message,
				});
				return resultados;
			}

			resultados.push({
				processoId: p.id,
				num_processo: mascararNumeroProcesso(p.num_processo),
				status: 'erro',
				fonte: null,
				sql: null,
				tipologiaAplicada: null,
				detalhe: e instanceof Error ? e.message : 'Erro no backfill',
			});
		}

		return resultados;
	};

	// Pool: vários processos ao mesmo tempo (BI + GeoSampa são I/O), ordem preservada.
	const porIndice: ResultadoBackfillBiGeosampa[][] = new Array(ids.length);
	let proximo = 0;
	await Promise.all(
		Array.from({ length: Math.min(BACKFILL_CONCORRENCIA, ids.length) }, async () => {
			while (proximo < ids.length) {
				const i = proximo++;
				porIndice[i] = await processarUm(ids[i]);
			}
		}),
	);
	const resultados = porIndice.flat();

	await salvarConsultas(
		resultados.map((r) => ({
			processoId: r.processoId,
			tipoConsulta: 'BACKFILL' as const,
			status:
				r.status === 'atualizado'
					? ('ENCONTRADO' as const)
					: r.status === 'erro'
						? ('ERRO' as const)
						: ('NAO_ENCONTRADO' as const),
			fonte: r.fonte,
			encontradoBi: r.fonte?.includes('bi') ? true : null,
			sql: r.sql,
			tipologia: r.tipologiaAplicada,
			detalhe: r.detalhe,
		})),
	);

	return resultados;
}

export type ConsultaSalva = {
	processoId: string;
	tipoConsulta: 'BACKFILL' | 'PESQUISA';
	status: 'ENCONTRADO' | 'NAO_ENCONTRADO' | 'ERRO';
	fonte: string | null;
	encontradoBi: boolean | null;
	sql: string | null;
	tipologia: string | null;
	detalhe: string | null;
	tentativas: number;
	/** ISO 8601. */
	consultadoEm: string;
};

type ConsultaParaSalvar = Omit<ConsultaSalva, 'tentativas' | 'consultadoEm'>;

/**
 * Grava (upsert) o resultado de cada consulta, um registro por processo, para que
 * os "não encontrados" fiquem disponíveis para resolução manual depois.
 * Falha ao gravar nunca derruba a consulta.
 */
async function salvarConsultas(itens: ConsultaParaSalvar[]) {
	const agora = new Date();
	for (const c of itens) {
		const dados = {
			tipo_consulta: c.tipoConsulta,
			status: c.status,
			fonte: c.fonte,
			encontrado_bi: c.encontradoBi,
			sql: c.sql,
			tipologia: c.tipologia,
			detalhe: c.detalhe,
			consultado_em: agora,
		};
		try {
			await prisma.consultaDadosFaltantes.upsert({
				where: { processo_id: c.processoId },
				create: { processo_id: c.processoId, ...dados },
				update: { ...dados, tentativas: { increment: 1 } },
			});
		} catch (e) {
			console.error('[dados-faltantes] falha ao salvar consulta', c.processoId, e);
		}
	}
}

export async function listarConsultasSalvas(): Promise<ConsultaSalva[]> {
	const rows = await prisma.consultaDadosFaltantes.findMany();
	return rows.map((r) => ({
		processoId: r.processo_id,
		tipoConsulta: r.tipo_consulta as ConsultaSalva['tipoConsulta'],
		status: r.status,
		fonte: r.fonte,
		encontradoBi: r.encontrado_bi,
		sql: r.sql,
		tipologia: r.tipologia,
		detalhe: r.detalhe,
		tentativas: r.tentativas,
		consultadoEm: r.consultado_em.toISOString(),
	}));
}
