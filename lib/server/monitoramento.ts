import type { IGeoSampaResult } from '@/types/geosampa';
import {
	type GeoSampaMonitoramentoPayload,
	mapGeoSampaParaMonitoramento,
} from '@/lib/enquadramento-persistencia';
import { CAMPOS_DATA_CIVIL, parseDataCivil } from '@/lib/datas';
import { SECOES_MONITORAMENTO_DEUSO } from '@/lib/monitoramento-secoes';
import { prisma } from '@/lib/prisma';
import { buscarDetalheProcesso } from '@/lib/server/processos';
import {
	IncidenciaCotaSolidariedade,
	OrigemMonitoramento,
	Prisma,
	SituacaoMonitoramento,
	TipoLicencaMonitoramento,
} from '@prisma/client';

const CAMPOS_DATA = CAMPOS_DATA_CIVIL;
const CAMPOS_NUMERICOS = new Set([
	'coordenada_e',
	'coordenada_n',
	'area_computavel_total',
	'area_construida_total',
	'coeficiente_basico',
	'coeficiente_utilizado',
	'area_terreno',
	'valor_m2_quadro14',
	'area_fruicao_publica',
	'area_doacao_melhoramento',
	'area_doacao_calcada',
	'area_transferencia',
	'area_habitacao_social',
]);

function limparValor(chave: string, valor: unknown): unknown {
	if (valor === '' || valor === null || valor === undefined) return undefined;
	if (typeof valor === 'string' && valor.trim() === '') return undefined;

	if (CAMPOS_DATA.has(chave)) {
		return parseDataCivil(valor) ?? undefined;
	}

	if (typeof valor === 'string' && CAMPOS_NUMERICOS.has(chave)) {
		const normalizado = valor.replace(/\./g, '').replace(',', '.');
		const n = Number.parseFloat(normalizado);
		return Number.isFinite(n) ? n : undefined;
	}

	return valor;
}

function limparRegistro(registro: Record<string, unknown>): Record<string, unknown> {
	const limpo: Record<string, unknown> = {};
	for (const [chave, valor] of Object.entries(registro)) {
		if (chave === 'id' || chave === 'monitoramento_ficha_id' || chave === 'criado_em' || chave === 'alterado_em') {
			continue;
		}
		const v = limparValor(chave, valor);
		if (v !== undefined) limpo[chave] = v;
	}
	return limpo;
}

type PayloadSecao = Record<string, unknown> | Record<string, unknown>[];

async function upsertRelacaoUnica(
	tx: Prisma.TransactionClient,
	fichaId: string,
	secaoId: string,
	dados: Record<string, unknown>,
) {
	const relacoes: Record<string, (id: string, d: Record<string, unknown>) => Promise<unknown>> = {
		coordenada: (id, d) =>
			tx.monitoramentoCoordenada.upsert({
				where: { monitoramento_ficha_id: id },
				create: { monitoramento_ficha_id: id, ...d },
				update: d,
			}),
		localizacao: (id, d) =>
			tx.monitoramentoLocalizacaoLote.upsert({
				where: { monitoramento_ficha_id: id },
				create: { monitoramento_ficha_id: id, ...d },
				update: d,
			}),
		enquadramento: (id, d) =>
			tx.monitoramentoEnquadramentoUrbanistico.upsert({
				where: { monitoramento_ficha_id: id },
				create: { monitoramento_ficha_id: id, ...d },
				update: d,
			}),
		subcategorias: (id, d) =>
			tx.monitoramentoSubcategoriaUso.upsert({
				where: { monitoramento_ficha_id: id },
				create: { monitoramento_ficha_id: id, ...d },
				update: d,
			}),
		situacao: (id, d) =>
			tx.monitoramentoSituacao.upsert({
				where: { monitoramento_ficha_id: id },
				create: {
					monitoramento_ficha_id: id,
					incidencia_cota_solidariedade: d.incidencia_cota_solidariedade as
						| IncidenciaCotaSolidariedade
						| undefined,
					situacao: d.situacao as SituacaoMonitoramento | undefined,
					origem: d.origem as OrigemMonitoramento | undefined,
				},
				update: {
					incidencia_cota_solidariedade: d.incidencia_cota_solidariedade as
						| IncidenciaCotaSolidariedade
						| undefined,
					situacao: d.situacao as SituacaoMonitoramento | undefined,
					origem: d.origem as OrigemMonitoramento | undefined,
				},
			}),
		anotacoes: (id, d) =>
			tx.monitoramentoAnotacaoDeuso.upsert({
				where: { monitoramento_ficha_id: id },
				create: { monitoramento_ficha_id: id, ...d },
				update: d,
			}),
	};

	const fn = relacoes[secaoId];
	if (!fn) throw new Error('Seção de monitoramento inválida.');
	await fn(fichaId, dados);
}

export async function salvarSecaoMonitoramentoDeuso(
	processoId: string,
	secaoId: string,
	payload: PayloadSecao,
) {
	if (!SECOES_MONITORAMENTO_DEUSO.has(secaoId)) {
		throw new Error('Seção de monitoramento inválida.');
	}

	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');

	await prisma.$transaction(async (tx) => {
		let ficha = await tx.monitoramentoFicha.findUnique({
			where: { processo_id: processoId },
		});

		if (!ficha) {
			ficha = await tx.monitoramentoFicha.create({
				data: { processo_id: processoId },
			});
		}

		if (secaoId === 'monitoramento') {
			const dados = limparRegistro(payload as Record<string, unknown>);
			await tx.monitoramentoFicha.update({
				where: { id: ficha.id },
				data: dados,
			});
			return;
		}

		if (secaoId === 'enderecos') {
			const lista = (payload as Record<string, unknown>[]).map((item, index) => ({
				...limparRegistro(item),
				ordem: Number(item.ordem) || index + 1,
				monitoramento_ficha_id: ficha!.id,
			}));
			await tx.monitoramentoEndereco.deleteMany({
				where: { monitoramento_ficha_id: ficha.id },
			});
			if (lista.length > 0) {
				await tx.monitoramentoEndereco.createMany({ data: lista });
			}
			return;
		}

		if (secaoId === 'licencas') {
			const lista = (payload as Record<string, unknown>[])
				.filter((item) => item.tipo)
				.map((item) => ({
					...limparRegistro(item),
					tipo: item.tipo as TipoLicencaMonitoramento,
					monitoramento_ficha_id: ficha!.id,
				}));
			await tx.monitoramentoLicenca.deleteMany({
				where: { monitoramento_ficha_id: ficha.id },
			});
			if (lista.length > 0) {
				await tx.monitoramentoLicenca.createMany({ data: lista });
			}
			return;
		}

		const dados = limparRegistro(payload as Record<string, unknown>);
		await upsertRelacaoUnica(tx, ficha.id, secaoId, dados);
	});

	return buscarDetalheProcesso(processoId);
}

async function aplicarPayloadGeoSampaNaFicha(
	tx: Prisma.TransactionClient,
	fichaId: string,
	payload: GeoSampaMonitoramentoPayload,
) {
	const {
		coordenada,
		localizacao_lote,
		enderecos,
		enquadramento_urbanistico,
		subcategorias_uso,
		calculo_outorga,
		situacao,
		licencas,
		anotacoes_deuso,
		...dadosFicha
	} = payload;

	if (Object.keys(dadosFicha).length > 0) {
		await tx.monitoramentoFicha.update({
			where: { id: fichaId },
			data: dadosFicha,
		});
	}

	if (coordenada) {
		await tx.monitoramentoCoordenada.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...coordenada },
			update: coordenada,
		});
	}

	if (localizacao_lote) {
		await tx.monitoramentoLocalizacaoLote.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...localizacao_lote },
			update: localizacao_lote,
		});
	}

	if (enquadramento_urbanistico) {
		await tx.monitoramentoEnquadramentoUrbanistico.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...enquadramento_urbanistico },
			update: enquadramento_urbanistico,
		});
	}

	if (subcategorias_uso) {
		await tx.monitoramentoSubcategoriaUso.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...subcategorias_uso },
			update: subcategorias_uso,
		});
	}

	if (calculo_outorga) {
		await tx.monitoramentoCalculoOutorga.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...calculo_outorga },
			update: calculo_outorga,
		});
	}

	if (situacao) {
		await tx.monitoramentoSituacao.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: {
				monitoramento_ficha_id: fichaId,
				incidencia_cota_solidariedade: situacao.incidencia_cota_solidariedade as
					| IncidenciaCotaSolidariedade
					| undefined,
				situacao: situacao.situacao as SituacaoMonitoramento | undefined,
				origem: situacao.origem as OrigemMonitoramento | undefined,
			},
			update: {
				incidencia_cota_solidariedade: situacao.incidencia_cota_solidariedade as
					| IncidenciaCotaSolidariedade
					| undefined,
				situacao: situacao.situacao as SituacaoMonitoramento | undefined,
				origem: situacao.origem as OrigemMonitoramento | undefined,
			},
		});
	}

	if (anotacoes_deuso) {
		const anotacoes = {
			...anotacoes_deuso,
			data_informacao_dmus: anotacoes_deuso.data_informacao_dmus
				? parseDataCivil(anotacoes_deuso.data_informacao_dmus)
				: undefined,
		};
		await tx.monitoramentoAnotacaoDeuso.upsert({
			where: { monitoramento_ficha_id: fichaId },
			create: { monitoramento_ficha_id: fichaId, ...anotacoes },
			update: anotacoes,
		});
	}

	if (enderecos) {
		await tx.monitoramentoEndereco.deleteMany({ where: { monitoramento_ficha_id: fichaId } });
		if (enderecos.length > 0) {
			await tx.monitoramentoEndereco.createMany({
				data: enderecos.map((endereco, index) => ({
					...endereco,
					ordem: endereco.ordem || index + 1,
					monitoramento_ficha_id: fichaId,
				})),
			});
		}
	}

	if (licencas) {
		await tx.monitoramentoLicenca.deleteMany({ where: { monitoramento_ficha_id: fichaId } });
		const lista = licencas
			.filter((l) => l.tipo)
			.map((licenca) => ({
				tipo: licenca.tipo as TipoLicencaMonitoramento,
				numero: licenca.numero,
				tipo_documento: licenca.tipo_documento,
				data_expedicao: licenca.data_expedicao
					? parseDataCivil(licenca.data_expedicao)
					: undefined,
				monitoramento_ficha_id: fichaId,
			}));
		if (lista.length > 0) {
			await tx.monitoramentoLicenca.createMany({ data: lista });
		}
	}
}

export async function salvarDadosGeoSampaNoProcesso(
	processoId: string,
	modo: 'SQL' | 'PROCESSO',
	identificador: string,
	geosampa: IGeoSampaResult,
) {
	const processo = await prisma.processo.findUnique({ where: { id: processoId } });
	if (!processo) throw new Error('Processo não encontrado.');

	const payload = mapGeoSampaParaMonitoramento(geosampa, { modo, identificador });

	await prisma.$transaction(async (tx) => {
		const ficha = await tx.monitoramentoFicha.upsert({
			where: { processo_id: processoId },
			create: { processo_id: processoId },
			update: {},
		});

		await aplicarPayloadGeoSampaNaFicha(tx, ficha.id, payload);
	});

	return buscarDetalheProcesso(processoId);
}
