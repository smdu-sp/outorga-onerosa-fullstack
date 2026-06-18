import { montarSqlDaLocalizacao, parseSqlParaLocalizacao, RE_SQL } from '@/lib/geosampa-sql.util';
import { prisma } from '@/lib/prisma';
import { processoDetalheInclude } from '@/lib/server/processos';
import type { IGeoSampaResult } from '@/types/geosampa';
import { Prisma } from '@prisma/client';
import { buscarSqlPorProcessoNoBi } from './bi-cadastro';
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
		const doBanco = await buscarPorSql(identificador);
		const data = doBanco ?? (await consultarSqlNoWfs(identificador));
		return {
			data,
			modoSalvamento: 'SQL',
			identificadorSalvamento: identificador,
		};
	}

	const identificador = processo!.trim();
	if (!RE_PROCESSO.test(identificador)) {
		throw new GeoSampaConsultaError(
			'Número inválido. Formato esperado: 0000.0000/0000000-0.',
			'INVALIDO',
		);
	}

	const sqlResolvido = await resolverSqlParaProcesso(identificador);
	if (sqlResolvido) {
		const doBanco = await buscarPorSql(sqlResolvido);
		const data = doBanco ?? (await consultarSqlNoWfs(sqlResolvido));
		return {
			data: { ...data, num_processo: identificador },
			modoSalvamento: 'SQL',
			identificadorSalvamento: sqlResolvido,
		};
	}

	const doBanco = await buscarPorProcesso(identificador);
	if (doBanco) {
		return {
			data: doBanco,
			modoSalvamento: 'PROCESSO',
			identificadorSalvamento: identificador,
		};
	}

	const data = await consultarProcessoNoWfs(identificador);
	return {
		data,
		modoSalvamento: 'PROCESSO',
		identificadorSalvamento: identificador,
	};
}

async function resolverSqlParaProcesso(numProcesso: string): Promise<string | null> {
	const proc = await prisma.processo.findUnique({
		where: { num_processo: numProcesso },
		include: { monitoramento: { include: { localizacao_lote: true } } },
	});

	const sqlLocal = proc?.monitoramento?.localizacao_lote
		? montarSqlDaLocalizacao(proc.monitoramento.localizacao_lote)
		: null;
	if (sqlLocal) return sqlLocal;

	return buscarSqlPorProcessoNoBi(numProcesso);
}

async function consultarSqlNoWfs(sql: string): Promise<IGeoSampaResult> {
	try {
		const lote = await wfs.buscarLotePorSql(sql);
		if (!lote) {
			throw new GeoSampaConsultaError(
				`Nenhum lote encontrado no GeoSampa para o SQL ${sql}.`,
				'NAO_ENCONTRADO',
			);
		}
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

async function consultarProcessoNoWfs(processo: string): Promise<IGeoSampaResult> {
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
		localizacao_lote: ficha.localizacao_lote ?? undefined,
		enderecos: ficha.enderecos?.length
			? ficha.enderecos.map((e) => ({
					ordem: e.ordem,
					tipo: e.tipo ?? undefined,
					titulo: e.titulo ?? undefined,
					nome: e.nome ?? undefined,
					numero: e.numero ?? undefined,
				}))
			: undefined,
		enquadramento_urbanistico: ficha.enquadramento_urbanistico ?? undefined,
		subcategorias_uso: ficha.subcategorias_uso ?? undefined,
		calculo_outorga: ficha.calculo_outorga
			? {
					...ficha.calculo_outorga,
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
