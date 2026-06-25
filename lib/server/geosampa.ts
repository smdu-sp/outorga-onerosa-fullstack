import { montarSqlDaLocalizacao, parseSqlParaLocalizacao, RE_SQL } from '@/lib/geosampa-sql.util';
import { prisma } from '@/lib/prisma';
import { processoDetalheInclude } from '@/lib/server/processos';
import type { GeoSampaLogFn, IGeoSampaResult } from '@/types/geosampa';
import { Prisma } from '@prisma/client';
import { buscarSqlFilhoPorSqlPaiNoBi, buscarSqlPorProcessoNoBi } from './bi-cadastro';
import { GeosampaWfsClient } from './geosampa-wfs.client';
import {
	mapEnquadramentoFromCamadas,
	mapLoteWfsParaGeoSampa,
	mapOutorgaWfsParaGeoSampa,
} from './geosampa-wfs.mapper';

const RE_PROCESSO = /^\d{4}\.\d{4}\/\d{7}-\d$/;

export type ConsultaGeoSampaResolvida = {
	data: IGeoSampaResult;
	modoSalvamento: 'SQL' | 'PROCESSO';
	identificadorSalvamento: string;
};

type FichaCompleta = Prisma.MonitoramentoFichaGetPayload<{
	include: {
		coordenada: true;
		localizacao_lote: true;
		enderecos: true;
		enquadramento_urbanistico: true;
		subcategorias_uso: true;
		calculo_outorga: true;
		situacao: true;
		licencas: true;
		anotacoes_deuso: true;
		processo: { select: { num_processo: true } };
	};
}>;

export class GeoSampaConsultaError extends Error {
	constructor(
		message: string,
		readonly codigo: 'INVALIDO' | 'NAO_ENCONTRADO' | 'WFS',
	) {
		super(message);
		this.name = 'GeoSampaConsultaError';
	}
}

const wfs = new GeosampaWfsClient();

export async function consultarGeoSampa(
	sql?: string,
	processo?: string,
	log: GeoSampaLogFn = () => {},
): Promise<ConsultaGeoSampaResolvida> {
	if (sql && processo) {
		throw new GeoSampaConsultaError(
			'Informe apenas sql ou processo, não ambos.',
			'INVALIDO',
		);
	}
	if (!sql && !processo) {
		throw new GeoSampaConsultaError('Informe sql ou processo.', 'INVALIDO');
	}

	if (sql) {
		const identificador = sql.trim();
		if (!RE_SQL.test(identificador)) {
			throw new GeoSampaConsultaError(
				'SQL inválido. Formato esperado: 000.000.0000-0.',
				'INVALIDO',
			);
		}

		log('info', `Modo: SQL — ${identificador}`);
		log('info', 'Verificando dados salvos no banco local pelo SQL...');
		const doBanco = await buscarPorSql(identificador);

		let data: IGeoSampaResult;
		if (doBanco) {
			log('success', 'Dados encontrados no banco local — sem consulta ao GeoSampa WFS.');
			data = doBanco;
		} else {
			log('info', 'Banco local sem dados para este SQL.');
			log('info', `Consultando lote no GeoSampa WFS pelo SQL ${identificador}...`);
			try {
				data = await consultarSqlNoWfs(identificador, log);
				log('success', 'Lote encontrado e enriquecido com dados espaciais.');
			} catch (e) {
				log('error', `Falha no WFS: ${(e as Error).message}`);
				throw e;
			}
		}

		return { data, modoSalvamento: 'SQL', identificadorSalvamento: identificador };
	}

	const identificador = processo!.trim();
	if (!RE_PROCESSO.test(identificador)) {
		throw new GeoSampaConsultaError(
			'Número inválido. Formato esperado: 0000.0000/0000000-0.',
			'INVALIDO',
		);
	}

	log('info', `Modo: PROCESSO — ${identificador}`);
	log('info', 'Resolvendo SQL para o processo...');
	const sqlResolvido = await resolverSqlParaProcesso(identificador, log);

	if (sqlResolvido) {
		log('success', `SQL resolvido: ${sqlResolvido}`);
		log('info', 'Verificando dados salvos no banco local pelo SQL resolvido...');
		const doBanco = await buscarPorSql(sqlResolvido);

		let data: IGeoSampaResult;
		if (doBanco) {
			log('success', 'Dados encontrados no banco local — sem consulta ao GeoSampa WFS.');
			data = doBanco;
		} else {
			log('info', 'Banco local sem dados para este SQL.');
			log('info', `Consultando lote no GeoSampa WFS pelo SQL ${sqlResolvido}...`);
			try {
				data = await consultarSqlNoWfs(sqlResolvido, log);
				log('success', 'Lote encontrado e enriquecido com dados espaciais.');
			} catch (e) {
				log('error', `Falha no WFS: ${(e as Error).message}`);
				throw e;
			}
		}

		return {
			data: { ...data, num_processo: identificador },
			modoSalvamento: 'SQL',
			identificadorSalvamento: sqlResolvido,
		};
	}

	log('warn', 'SQL não resolvido — verificando dados locais pelo número do processo...');
	log('info', 'Buscando dados salvos no banco local pelo processo...');
	const doBanco = await buscarPorProcesso(identificador);
	if (doBanco) {
		log('success', 'Dados locais encontrados — retornando sem consulta ao GeoSampa WFS.');
		return {
			data: doBanco,
			modoSalvamento: 'PROCESSO',
			identificadorSalvamento: identificador,
		};
	}

	log('error', `SQL não encontrado no banco local nem no BI para o processo ${identificador}.`);
	throw new GeoSampaConsultaError(
		`Número SQL não encontrado para o processo ${identificador}. Informe o SQL manualmente para consultar o GeoSampa.`,
		'NAO_ENCONTRADO',
	);
}

async function resolverSqlParaProcesso(numProcesso: string, log: GeoSampaLogFn): Promise<string | null> {
	log('info', 'Verificando banco local (localizacao_lote do monitoramento)...');
	const proc = await prisma.processo.findUnique({
		where: { num_processo: numProcesso },
		include: { monitoramento: { include: { localizacao_lote: true } } },
	});

	const sqlLocal = proc?.monitoramento?.localizacao_lote
		? montarSqlDaLocalizacao(proc.monitoramento.localizacao_lote)
		: null;

	if (sqlLocal) {
		log('success', `SQL encontrado no banco local: ${sqlLocal}`);
		return sqlLocal;
	}

	log('info', 'SQL não encontrado no banco local — consultando banco BI (dbo.cadastros)...');
	const sqlBi = await buscarSqlPorProcessoNoBi(numProcesso, log);

	if (sqlBi) {
		log('success', `SQL encontrado no banco BI: ${sqlBi}`);
	} else {
		log('warn', 'SQL não encontrado no banco BI.');
	}

	return sqlBi;
}

async function consultarSqlNoWfs(
	sql: string,
	log: GeoSampaLogFn = () => {},
): Promise<IGeoSampaResult> {
	try {
		const cqlComDigito = GeosampaWfsClient.sqlParaCql(sql);
		log('info', `WFS (com dígito): ${cqlComDigito}`);
		let lote = await wfs.buscarLotePorSql(sql);
		log(lote ? 'success' : 'warn', lote ? 'Lote encontrado com dígito.' : 'Nenhum resultado com dígito.');

		if (!lote) {
			const cqlSemDigito = GeosampaWfsClient.sqlParaCqlSemDigito(sql);
			log('info', `WFS (sem dígito): ${cqlSemDigito}`);
			lote = await wfs.buscarLotePorSqlSemDigito(sql);
			log(lote ? 'success' : 'warn', lote ? 'Lote encontrado sem dígito.' : 'Nenhum resultado sem dígito.');
		}

		if (!lote) {
			const cqlLoteZero = GeosampaWfsClient.sqlParaCqlLoteZero(sql);
			log('info', `WFS (lote 0000): ${cqlLoteZero}`);
			lote = await wfs.buscarLotePorSqlLoteZero(sql);
			log(lote ? 'success' : 'warn', lote ? 'Lote encontrado com lote 0000.' : 'Nenhum resultado com lote 0000.');
		}

		if (!lote) {
			log('info', `SQL não encontrado no GeoSampa — consultando dbo.SQLsFiliacao para sqlPai: ${sql}...`);
			const sqlFilho = await buscarSqlFilhoPorSqlPaiNoBi(sql, log);
			if (sqlFilho) {
				log('info', `sqlFilho encontrado: ${sqlFilho} — tentando novamente no GeoSampa WFS...`);
				lote = await wfs.buscarLotePorSql(sqlFilho);
				log(lote ? 'success' : 'warn', lote ? 'Lote encontrado com sqlFilho (com dígito).' : 'Nenhum resultado com sqlFilho (com dígito).');

				if (!lote) {
					lote = await wfs.buscarLotePorSqlSemDigito(sqlFilho);
					log(lote ? 'success' : 'warn', lote ? 'Lote encontrado com sqlFilho (sem dígito).' : 'Nenhum resultado com sqlFilho (sem dígito).');
				}

				if (!lote) {
					lote = await wfs.buscarLotePorSqlLoteZero(sqlFilho);
					log(lote ? 'success' : 'warn', lote ? 'Lote encontrado com sqlFilho (lote 0000).' : 'Nenhum resultado com sqlFilho (lote 0000).');
				}
			} else {
				log('warn', 'Nenhum sqlFilho encontrado em dbo.SQLsFiliacao.');
			}
		}

		if (!lote) {
			throw new GeoSampaConsultaError(
				`Nenhum lote encontrado no GeoSampa para o SQL ${sql}.`,
				'NAO_ENCONTRADO',
			);
		}

		log('info', 'Enriquecendo lote com dados espaciais (zoneamento, subprefeitura, distrito...)');
		const enriquecimento = await enriquecerEspacialmente(lote);
		return mapLoteWfsParaGeoSampa(lote, enriquecimento);
	} catch (error) {
		if (error instanceof GeoSampaConsultaError) throw error;
		throw new GeoSampaConsultaError(
			`Falha ao consultar o GeoSampa: ${(error as Error).message}`,
			'WFS',
		);
	}
}

export async function consultarProcessoNoWfs(processo: string): Promise<IGeoSampaResult> {
	try {
		const outorga = await wfs.buscarOutorgaPorProcesso(processo);
		if (!outorga) {
			throw new GeoSampaConsultaError(
				`Nenhum processo encontrado no GeoSampa para ${processo}.`,
				'NAO_ENCONTRADO',
			);
		}

		const proc = await prisma.processo.findUnique({
			where: { num_processo: processo },
			include: processoDetalheInclude,
		});
		const loteDto = proc?.monitoramento
			? mapFichaParaGeoSampa(proc.monitoramento, processo)
			: undefined;

		let resultado = mapOutorgaWfsParaGeoSampa(outorga, loteDto, processo);

		if (!loteDto) {
			const ponto = GeosampaWfsClient.pontoFromGeometry(outorga.geometry ?? null);
			if (ponto) {
				const camadas = await buscarCamadasNoPonto(ponto.x, ponto.y);
				resultado = {
					...resultado,
					enquadramento_urbanistico: {
						...mapEnquadramentoFromCamadas(camadas),
						...resultado.enquadramento_urbanistico,
					},
				};
			}
		}

		return resultado;
	} catch (error) {
		if (error instanceof GeoSampaConsultaError) throw error;
		throw new GeoSampaConsultaError(
			`Falha ao consultar o GeoSampa: ${(error as Error).message}`,
			'WFS',
		);
	}
}

async function enriquecerEspacialmente(
	lote: Awaited<ReturnType<GeosampaWfsClient['buscarLotePorSql']>>,
) {
	const centroid = GeosampaWfsClient.centroidFromGeometry(lote?.geometry ?? null);
	if (!centroid) return {};
	return buscarCamadasNoPonto(centroid.x, centroid.y);
}

async function buscarCamadasNoPonto(x: number, y: number) {
	const [zoneamento, macroarea, subprefeitura, distrito, subsetor] = await Promise.all([
		wfs.buscarZoneamentoNoPonto(x, y),
		wfs.buscarMacroareaNoPonto(x, y),
		wfs.buscarSubprefeituraNoPonto(x, y),
		wfs.buscarDistritoNoPonto(x, y),
		wfs.buscarSubsetorNoPonto(x, y),
	]);

	return {
		zoneamento: zoneamento.features,
		macroarea,
		subprefeitura,
		distrito,
		subsetor,
	};
}

async function buscarPorProcesso(numProcesso: string): Promise<IGeoSampaResult | null> {
	const proc = await prisma.processo.findUnique({
		where: { num_processo: numProcesso },
		include: processoDetalheInclude,
	});
	if (!proc?.monitoramento) return null;
	return mapFichaParaGeoSampa(proc.monitoramento, numProcesso);
}

async function buscarPorSql(sql: string): Promise<IGeoSampaResult | null> {
	const loc = parseSqlParaLocalizacao(sql);
	if (!loc) return null;

	const ficha = await prisma.monitoramentoFicha.findFirst({
		where: {
			localizacao_lote: {
				setor: loc.setor,
				quadra: loc.quadra,
				lote_cadastrado: loc.lote_cadastrado,
			},
		},
		include: {
			coordenada: true,
			localizacao_lote: true,
			enderecos: { orderBy: { ordem: 'asc' } },
			enquadramento_urbanistico: true,
			subcategorias_uso: true,
			calculo_outorga: true,
			situacao: true,
			licencas: true,
			anotacoes_deuso: true,
			processo: { select: { num_processo: true } },
		},
	});

	if (!ficha) return null;
	return mapFichaParaGeoSampa(ficha, ficha.processo?.num_processo);
}

function mapFichaParaGeoSampa(ficha: FichaCompleta, numProcesso?: string): IGeoSampaResult {
	const decimal = (v: Prisma.Decimal | null | undefined) =>
		v != null ? Number(v) : undefined;
	const dataIso = (d: Date | null | undefined) =>
		d ? d.toISOString().slice(0, 10) : undefined;

	return {
		num_processo: numProcesso,
		responsavel_preenchimento: ficha.responsavel_preenchimento ?? undefined,
		proposta_oodc_id: ficha.proposta_oodc_id ?? undefined,
		numero_proposta: ficha.numero_proposta ?? undefined,
		processo_modificativo: ficha.processo_modificativo ?? undefined,
		proprietario_interessado: ficha.proprietario_interessado ?? undefined,
		coordenada: ficha.coordenada
			? {
					coordenada_e: decimal(ficha.coordenada.coordenada_e),
					coordenada_n: decimal(ficha.coordenada.coordenada_n),
				}
			: undefined,
		localizacao_lote: ficha.localizacao_lote
			? {
					setor: ficha.localizacao_lote.setor ?? undefined,
					quadra: ficha.localizacao_lote.quadra ?? undefined,
					lote_cadastrado: ficha.localizacao_lote.lote_cadastrado ?? undefined,
					lote_atualizado: ficha.localizacao_lote.lote_atualizado ?? undefined,
					codigo_logradouro: ficha.localizacao_lote.codigo_logradouro ?? undefined,
				}
			: undefined,
		enderecos: ficha.enderecos?.length
			? ficha.enderecos.map((e) => ({
					ordem: e.ordem,
					tipo: e.tipo ?? undefined,
					titulo: e.titulo ?? undefined,
					nome: e.nome ?? undefined,
					numero: e.numero ?? undefined,
				}))
			: undefined,
		enquadramento_urbanistico: ficha.enquadramento_urbanistico
			? {
					distrito: ficha.enquadramento_urbanistico.distrito ?? undefined,
					subprefeitura: ficha.enquadramento_urbanistico.subprefeitura ?? undefined,
					macrozona: ficha.enquadramento_urbanistico.macrozona ?? undefined,
					macroarea: ficha.enquadramento_urbanistico.macroarea ?? undefined,
					subsetor: ficha.enquadramento_urbanistico.subsetor ?? undefined,
					zona_uso_1_18081: ficha.enquadramento_urbanistico.zona_uso_1_18081 ?? undefined,
					zona_uso_2_17975: ficha.enquadramento_urbanistico.zona_uso_2_17975 ?? undefined,
					zona_uso_3_16402: ficha.enquadramento_urbanistico.zona_uso_3_16402 ?? undefined,
					zona_uso_4_16050: ficha.enquadramento_urbanistico.zona_uso_4_16050 ?? undefined,
					zona_uso_5_13885: ficha.enquadramento_urbanistico.zona_uso_5_13885 ?? undefined,
					zona_uso_6_13885: ficha.enquadramento_urbanistico.zona_uso_6_13885 ?? undefined,
					tipologia_uso_oodc: ficha.enquadramento_urbanistico.tipologia_uso_oodc ?? undefined,
				}
			: undefined,
		subcategorias_uso: ficha.subcategorias_uso
			? {
					uso_r_hmp_his: ficha.subcategorias_uso.uso_r_hmp_his ?? undefined,
					uso_r_hmp_his_2: ficha.subcategorias_uso.uso_r_hmp_his_2 ?? undefined,
					uso_r_hmp_his_3: ficha.subcategorias_uso.uso_r_hmp_his_3 ?? undefined,
					uso_nr: ficha.subcategorias_uso.uso_nr ?? undefined,
					uso_nr_2: ficha.subcategorias_uso.uso_nr_2 ?? undefined,
					uso_nr_3: ficha.subcategorias_uso.uso_nr_3 ?? undefined,
					uso_extra: ficha.subcategorias_uso.uso_extra ?? undefined,
				}
			: undefined,
		calculo_outorga: ficha.calculo_outorga
			? {
					fp_uso_r: ficha.calculo_outorga.fp_uso_r ?? undefined,
					fp_uso_nr: ficha.calculo_outorga.fp_uso_nr ?? undefined,
					fs_uso_r: ficha.calculo_outorga.fs_uso_r ?? undefined,
					fs_uso_nr: ficha.calculo_outorga.fs_uso_nr ?? undefined,
					area_objeto_uso_r: ficha.calculo_outorga.area_objeto_uso_r ?? undefined,
					area_objeto_uso_nr: ficha.calculo_outorga.area_objeto_uso_nr ?? undefined,
					area_total_objeto: ficha.calculo_outorga.area_total_objeto ?? undefined,
					area_nao_computavel: ficha.calculo_outorga.area_nao_computavel ?? undefined,
					area_nao_computavel_incidente: ficha.calculo_outorga.area_nao_computavel_incidente ?? undefined,
					area_nao_computavel_final: ficha.calculo_outorga.area_nao_computavel_final ?? undefined,
					percentual_fachada_ativa: ficha.calculo_outorga.percentual_fachada_ativa ?? undefined,
					contrapartida_uso_r: ficha.calculo_outorga.contrapartida_uso_r ?? undefined,
					contrapartida_uso_nr: ficha.calculo_outorga.contrapartida_uso_nr ?? undefined,
					contrapartida_total: ficha.calculo_outorga.contrapartida_total ?? undefined,
					area_computavel_total: decimal(ficha.calculo_outorga.area_computavel_total),
					area_construida_total: decimal(ficha.calculo_outorga.area_construida_total),
					coeficiente_basico: decimal(ficha.calculo_outorga.coeficiente_basico),
					coeficiente_utilizado: decimal(ficha.calculo_outorga.coeficiente_utilizado),
					area_terreno: decimal(ficha.calculo_outorga.area_terreno),
					valor_m2_quadro14: decimal(ficha.calculo_outorga.valor_m2_quadro14),
					area_fruicao_publica: decimal(ficha.calculo_outorga.area_fruicao_publica),
					area_doacao_melhoramento: decimal(ficha.calculo_outorga.area_doacao_melhoramento),
					area_doacao_calcada: decimal(ficha.calculo_outorga.area_doacao_calcada),
					area_transferencia: decimal(ficha.calculo_outorga.area_transferencia),
					area_habitacao_social: decimal(ficha.calculo_outorga.area_habitacao_social),
				}
			: undefined,
		situacao: ficha.situacao
			? {
					incidencia_cota_solidariedade:
						ficha.situacao.incidencia_cota_solidariedade ?? undefined,
					situacao: ficha.situacao.situacao ?? undefined,
					origem: ficha.situacao.origem ?? undefined,
				}
			: undefined,
		licencas: ficha.licencas?.length
			? ficha.licencas.map((l) => ({
					tipo: l.tipo,
					numero: l.numero ?? undefined,
					tipo_documento: l.tipo_documento ?? undefined,
					data_expedicao: dataIso(l.data_expedicao),
				}))
			: undefined,
		anotacoes_deuso: ficha.anotacoes_deuso
			? {
					observacao_historico: ficha.anotacoes_deuso.observacao_historico ?? undefined,
					data_informacao_dmus: dataIso(ficha.anotacoes_deuso.data_informacao_dmus),
					solicitacao_dsiz: ficha.anotacoes_deuso.solicitacao_dsiz ?? undefined,
					preenchimento_qgis: ficha.anotacoes_deuso.preenchimento_qgis ?? undefined,
				}
			: undefined,
	};
}
