import type { IGeoSampaResult } from '@/types/geosampa';
import {
	GeosampaWfsClient,
	type LoteProperties,
	type OutorgaProperties,
	type WfsFeatureCollection,
	type ZoneamentoProperties,
} from './geosampa-wfs.client';

const LEGISLACAO_ZONA: Record<
	number,
	keyof NonNullable<IGeoSampaResult['enquadramento_urbanistico']>
> = {
	18081: 'zona_uso_1_18081',
	17975: 'zona_uso_2_17975',
	16402: 'zona_uso_3_16402',
	16050: 'zona_uso_4_16050',
	13885: 'zona_uso_5_13885',
};

function titleCase(value: string): string {
	return value
		.toLowerCase()
		.split(/(\s+|[-/])/)
		.map((part) =>
			/^\s+$|[-/]/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
		)
		.join('');
}

function parseNumeroBr(value?: string | number): number | undefined {
	if (value == null || value === '') return undefined;
	if (typeof value === 'number') return value;
	const normalized = value.replace(/\./g, '').replace(',', '.');
	const n = Number(normalized);
	return Number.isFinite(n) ? n : undefined;
}

function parseLogradouroCompleto(nome?: string): { tipo?: string; nome?: string } {
	if (!nome) return {};
	const match = nome.trim().match(/^([A-Z]{1,4})\s+(.+)$/i);
	if (!match) return { nome: titleCase(nome) };

	const abrev: Record<string, string> = {
		R: 'Rua',
		AV: 'Avenida',
		AL: 'Alameda',
		PCA: 'Praça',
		TV: 'Travessa',
		EST: 'Estrada',
		ROD: 'Rodovia',
		PAS: 'Passeio',
		LGO: 'Largo',
		VLA: 'Viela',
		PC: 'Praça',
		PRC: 'Praça',
	};

	return {
		tipo: abrev[match[1].toUpperCase()] ?? match[1],
		nome: titleCase(match[2]),
	};
}

function parseEnderecoOutorga(endereco?: string): IGeoSampaResult['enderecos'] {
	if (!endereco) return undefined;
	const [logradouro, numeroRaw] = endereco.split(',').map((s) => s.trim());
	const parsed = parseLogradouroCompleto(logradouro);
	return [
		{
			ordem: 1,
			tipo: parsed.tipo,
			nome: parsed.nome ?? titleCase(logradouro),
			numero: numeroRaw || undefined,
		},
	];
}

function mapZoneamento(
	features: WfsFeatureCollection<ZoneamentoProperties>['features'],
): NonNullable<IGeoSampaResult['enquadramento_urbanistico']> {
	const enquadramento: NonNullable<IGeoSampaResult['enquadramento_urbanistico']> = {};
	let zona13885Count = 0;

	for (const feature of features) {
		const leg = feature.properties.cd_numero_legislacao_zoneamento;
		const zona = feature.properties.tx_zoneamento_perimetro;
		if (!leg || !zona) continue;

		const field = LEGISLACAO_ZONA[leg];
		if (field) {
			enquadramento[field] = zona;
			if (leg === 13885) zona13885Count += 1;
			if (leg === 13885 && zona13885Count > 1) {
				enquadramento.zona_uso_6_13885 = zona;
			}
		}
	}

	return enquadramento;
}

function mapLoteLocalizacao(props: LoteProperties) {
	const digito = props.cd_digito_sql ?? 0;
	const lote = props.cd_lote ?? '';
	return {
		setor: props.cd_setor_fiscal,
		quadra: props.cd_quadra_fiscal,
		lote_cadastrado: lote ? `${lote}-${digito}` : undefined,
		lote_atualizado: lote ? `${lote}-${digito}` : undefined,
		codigo_logradouro: props.cd_logradouro,
	};
}

function mapLoteEnderecos(props: LoteProperties): IGeoSampaResult['enderecos'] {
	const parsed = parseLogradouroCompleto(props.nm_logradouro_completo);
	if (!parsed.nome && !props.nm_logradouro_completo) return undefined;
	return [
		{
			ordem: 1,
			tipo: parsed.tipo,
			nome: parsed.nome ?? titleCase(props.nm_logradouro_completo!),
			numero: props.cd_numero_porta || undefined,
		},
	];
}

function usoFromLote(props: LoteProperties): string | undefined {
	if (!props.tipo_uso_imovel) return undefined;
	const match = props.tipo_uso_imovel.match(/^\d+-(.+)$/);
	return match ? titleCase(match[1]) : titleCase(props.tipo_uso_imovel);
}

function parseSetorQuadra(cd_setor_quadra?: string) {
	if (!cd_setor_quadra || cd_setor_quadra.length < 6) return undefined;
	return {
		setor: cd_setor_quadra.slice(0, 3),
		quadra: cd_setor_quadra.slice(3, 6),
	};
}

function mapSituacaoWfs(value?: string): string | undefined {
	if (!value?.trim()) return undefined;
	const text = value.trim().toUpperCase();
	if (text.includes('QUITADO')) return 'QUITADO';
	if (text.includes('ARRECADADO')) return 'ARRECADADO_AD';
	if (text.includes('PAGAMENTO')) return 'EM_PAGAMENTO';
	return 'SEM_INFORMACAO';
}

function tipologiaCodigoFromUso(texto: string): 'R' | 'nR' {
	return texto.toLowerCase().includes('residencial') ? 'R' : 'nR';
}

export function mapLoteWfsParaGeoSampa(
	feature: WfsFeatureCollection<LoteProperties>['features'][0],
	enriquecimento?: {
		zoneamento?: WfsFeatureCollection<ZoneamentoProperties>['features'];
		macroarea?: { nm_macroarea?: string; sg_macroarea?: string } | null;
		subprefeitura?: { nm_subprefeitura?: string } | null;
		distrito?: { nm_distrito_municipal?: string } | null;
		subsetor?: {
			nm_subsetor_operacao_urbana?: string;
			nm_operacao_urbana?: string;
		} | null;
	},
): IGeoSampaResult {
	const props = feature.properties;
	const centroid = GeosampaWfsClient.centroidFromGeometry(feature.geometry ?? null);
	const zoneamento = enriquecimento?.zoneamento
		? mapZoneamento(enriquecimento.zoneamento)
		: {};

	return {
		proprietario_interessado: props.nm_proprietario
			? titleCase(props.nm_proprietario)
			: undefined,
		coordenada: centroid
			? { coordenada_e: centroid.x, coordenada_n: centroid.y }
			: undefined,
		localizacao_lote: mapLoteLocalizacao(props),
		enderecos: mapLoteEnderecos(props),
		enquadramento_urbanistico: {
			distrito: enriquecimento?.distrito?.nm_distrito_municipal
				? titleCase(enriquecimento.distrito.nm_distrito_municipal)
				: undefined,
			subprefeitura: enriquecimento?.subprefeitura?.nm_subprefeitura
				? titleCase(enriquecimento.subprefeitura.nm_subprefeitura)
				: undefined,
			macroarea: enriquecimento?.macroarea?.nm_macroarea
				? titleCase(enriquecimento.macroarea.nm_macroarea)
				: undefined,
			macrozona: enriquecimento?.macroarea?.sg_macroarea,
			subsetor: enriquecimento?.subsetor?.nm_subsetor_operacao_urbana
				? titleCase(enriquecimento.subsetor.nm_subsetor_operacao_urbana)
				: undefined,
			uso: usoFromLote(props),
			tipologia_uso_oodc: (() => {
				const u = usoFromLote(props);
				return u ? tipologiaCodigoFromUso(u) : undefined;
			})(),
			...zoneamento,
		},
		calculo_outorga: {
			area_terreno: props.qt_area_terreno_calc ?? props.qt_area_terreno,
		},
	};
}

export function mapOutorgaWfsParaGeoSampa(
	feature: WfsFeatureCollection<OutorgaProperties>['features'][0],
	lote?: IGeoSampaResult,
	numProcessoSei?: string,
): IGeoSampaResult {
	const props = feature.properties;
	const base: IGeoSampaResult = lote ? { ...lote } : {};
	const ponto = GeosampaWfsClient.pontoFromGeometry(feature.geometry ?? null);
	const localizacaoOutorga = parseSetorQuadra(props.cd_setor_quadra);

	return {
		...base,
		num_processo: numProcessoSei ?? props.cd_processo,
		numero_proposta: props.cd_proposta != null ? String(props.cd_proposta) : undefined,
		coordenada:
			base.coordenada ??
			(ponto ? { coordenada_e: ponto.x, coordenada_n: ponto.y } : undefined),
		localizacao_lote: base.localizacao_lote ?? (localizacaoOutorga
			? {
					...localizacaoOutorga,
					codigo_logradouro: props.cd_codlog,
				}
			: undefined),
		proprietario_interessado: base.proprietario_interessado,
		enderecos: base.enderecos?.length ? base.enderecos : parseEnderecoOutorga(props.nm_endereco),
		enquadramento_urbanistico: {
			...base.enquadramento_urbanistico,
			distrito: props.nm_distrito
				? titleCase(props.nm_distrito)
				: base.enquadramento_urbanistico?.distrito,
			tipologia_uso_oodc:
				props.cd_categoria_uso ?? base.enquadramento_urbanistico?.tipologia_uso_oodc,
		},
		calculo_outorga: {
			...base.calculo_outorga,
			coeficiente_utilizado: parseNumeroBr(props.cd_coeficiente_utilizacao),
			area_terreno: props.qt_area_terreno ?? base.calculo_outorga?.area_terreno,
			contrapartida_total: props.qt_valor_contrapartida?.toString(),
		},
		situacao: {
			...base.situacao,
			situacao: mapSituacaoWfs(props.tx_situacao) ?? base.situacao?.situacao,
			origem: base.situacao?.origem ?? 'OUTRO',
		},
		licencas: props.cd_numero_alvara
			? [
					{
						tipo: 'APROVACAO' as const,
						numero: props.cd_numero_alvara,
						tipo_documento: 'Alvará',
					},
				]
			: base.licencas,
	};
}

export function mapEnquadramentoFromCamadas(camadas: {
	zoneamento?: WfsFeatureCollection<ZoneamentoProperties>['features'];
	macroarea?: { nm_macroarea?: string; sg_macroarea?: string } | null;
	subprefeitura?: { nm_subprefeitura?: string } | null;
	distrito?: { nm_distrito_municipal?: string } | null;
	subsetor?: {
		nm_subsetor_operacao_urbana?: string;
		nm_operacao_urbana?: string;
	} | null;
}) {
	return mapLoteWfsParaGeoSampa(
		{ type: 'Feature', properties: {}, geometry: null },
		camadas,
	).enquadramento_urbanistico;
}
