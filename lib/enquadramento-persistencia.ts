import type { IGeoSampaResult } from '@/types/geosampa';

export const CAMPOS_ZONA = [
	'zona_uso_1_18081',
	'zona_uso_2_17975',
	'zona_uso_3_16402',
	'zona_uso_4_16050',
	'zona_uso_5_13885',
	'zona_uso_6_13885',
] as const;

export type GeoSampaMonitoramentoPayload = {
	responsavel_preenchimento?: string;
	proposta_oodc_id?: string;
	numero_proposta?: string;
	processo_modificativo?: string;
	proprietario_interessado?: string;
	coordenada?: IGeoSampaResult['coordenada'];
	localizacao_lote?: IGeoSampaResult['localizacao_lote'];
	enderecos?: IGeoSampaResult['enderecos'];
	enquadramento_urbanistico?: IGeoSampaResult['enquadramento_urbanistico'];
	subcategorias_uso?: IGeoSampaResult['subcategorias_uso'];
	calculo_outorga?: IGeoSampaResult['calculo_outorga'];
	situacao?: IGeoSampaResult['situacao'];
	licencas?: IGeoSampaResult['licencas'];
	anotacoes_deuso?: IGeoSampaResult['anotacoes_deuso'];
};

export function parseSqlParaLocalizacao(sql: string) {
	const match = sql.trim().match(/^(\d{3})\.(\d{3})\.(\d{4})-(\d)$/);
	if (!match) return null;

	const [, setor, quadra, lote, digito] = match;
	return {
		setor,
		quadra,
		lote_cadastrado: `${lote}-${digito}`,
	};
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const limpo: Partial<T> = {};
	for (const [chave, valor] of Object.entries(obj)) {
		if (valor !== undefined && valor !== null && valor !== '') {
			limpo[chave as keyof T] = valor as T[keyof T];
		}
	}
	return limpo;
}

export function mapGeoSampaParaMonitoramento(
	data: IGeoSampaResult,
	opts?: { modo?: 'SQL' | 'PROCESSO'; identificador?: string },
): GeoSampaMonitoramentoPayload {
	const sqlLocal =
		opts?.modo === 'SQL' && opts.identificador
			? parseSqlParaLocalizacao(opts.identificador)
			: null;

	const localizacao_lote = data.localizacao_lote ?? sqlLocal ?? undefined;

	return omitUndefined({
		responsavel_preenchimento: data.responsavel_preenchimento,
		proposta_oodc_id: data.proposta_oodc_id,
		numero_proposta: data.numero_proposta,
		processo_modificativo: data.processo_modificativo,
		proprietario_interessado: data.proprietario_interessado,
		coordenada: data.coordenada,
		localizacao_lote,
		enderecos: data.enderecos?.length ? data.enderecos : undefined,
		enquadramento_urbanistico: data.enquadramento_urbanistico,
		subcategorias_uso: data.subcategorias_uso,
		calculo_outorga: data.calculo_outorga,
		situacao: data.situacao,
		licencas: data.licencas?.length ? data.licencas : undefined,
		anotacoes_deuso: data.anotacoes_deuso,
	}) as GeoSampaMonitoramentoPayload;
}

/** @deprecated Use mapGeoSampaParaMonitoramento */
export function mapEnquadramentoParaMonitoramento(
	data: IGeoSampaResult,
	opts?: { modo?: 'SQL' | 'PROCESSO'; identificador?: string },
) {
	return mapGeoSampaParaMonitoramento(data, opts);
}
