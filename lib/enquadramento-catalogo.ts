/**
 * Catálogo canônico de Macrozona, Macroárea e Subsetor do PDE (Lei 16.050/14,
 * atualizada pela Lei 18.209/24). Estes são os únicos textos que devem aparecer
 * nos campos correspondentes da aba "Enquadramento urbanístico".
 *
 * As funções de normalização mapeiam valores vindos do GeoSampa ou de planilhas
 * antigas (Title Case, siglas, variações de digitação) para o texto canônico.
 */

export const MACROZONAS = [
	'ESTRUTURAÇÃO E QUALIFICAÇÃO URBANA',
	'PROTEÇÃO E RECUPERAÇÃO AMBIENTAL',
] as const;

export const MACROAREAS = [
	'ESTRUTURAÇÃO METROPOLITANA',
	'URBANIZAÇÃO CONSOLIDADA',
	'QUALIFICAÇÃO DA URBANIZAÇÃO',
	'REDUÇÃO DA VULNERABILIDADE URBANA',
	'REDUÇÃO DA VULNERABILIDADE URBANA E RECUPERAÇÃO AMBIENTAL',
	'CONTROLE E QUALIFICAÇÃO URBANA E AMBIENTAL',
	'CONTENÇÃO URBANA E USO SUSTENTÁVEL',
	'PRESERVAÇÃO DE ECOSSISTEMAS NATURAIS',
] as const;

export const SUBSETORES = [
	'NA',
	'ARCO LESTE',
	'ARCO TIETÊ',
	'ARCO TAMANDUATEÍ',
	'ARCO PINHEIROS',
	'ARCO FARIA LIMA - ÁGUAS ESPRAIADAS - CHUCRI ZAIDAN',
	'ARCO JURUBATUBA',
	'ARCO JACU-PÊSSEGO',
	'AVENIDA CUPECÊ',
	'NOROESTE',
	'FERNÃO DIAS',
	'SETOR CENTRAL',
] as const;

export type Macrozona = (typeof MACROZONAS)[number];
export type Macroarea = (typeof MACROAREAS)[number];
export type Subsetor = (typeof SUBSETORES)[number];

/** Cada macroárea pertence deterministicamente a uma das duas macrozonas. */
const MACROAREA_PARA_MACROZONA: Record<Macroarea, Macrozona> = {
	'ESTRUTURAÇÃO METROPOLITANA': 'ESTRUTURAÇÃO E QUALIFICAÇÃO URBANA',
	'URBANIZAÇÃO CONSOLIDADA': 'ESTRUTURAÇÃO E QUALIFICAÇÃO URBANA',
	'QUALIFICAÇÃO DA URBANIZAÇÃO': 'ESTRUTURAÇÃO E QUALIFICAÇÃO URBANA',
	'REDUÇÃO DA VULNERABILIDADE URBANA': 'ESTRUTURAÇÃO E QUALIFICAÇÃO URBANA',
	'REDUÇÃO DA VULNERABILIDADE URBANA E RECUPERAÇÃO AMBIENTAL':
		'PROTEÇÃO E RECUPERAÇÃO AMBIENTAL',
	'CONTROLE E QUALIFICAÇÃO URBANA E AMBIENTAL': 'PROTEÇÃO E RECUPERAÇÃO AMBIENTAL',
	'CONTENÇÃO URBANA E USO SUSTENTÁVEL': 'PROTEÇÃO E RECUPERAÇÃO AMBIENTAL',
	'PRESERVAÇÃO DE ECOSSISTEMAS NATURAIS': 'PROTEÇÃO E RECUPERAÇÃO AMBIENTAL',
};

/** Siglas usadas na camada GeoSampa `pde_macroarea_lei_18209` (sg_macroarea). */
const SIGLA_PARA_MACROAREA: Record<string, Macroarea> = {
	MEM: 'ESTRUTURAÇÃO METROPOLITANA',
	MUC: 'URBANIZAÇÃO CONSOLIDADA',
	MQU: 'QUALIFICAÇÃO DA URBANIZAÇÃO',
	MRVU: 'REDUÇÃO DA VULNERABILIDADE URBANA',
	MRVURA: 'REDUÇÃO DA VULNERABILIDADE URBANA E RECUPERAÇÃO AMBIENTAL',
	MCQUA: 'CONTROLE E QUALIFICAÇÃO URBANA E AMBIENTAL',
	MCUUS: 'CONTENÇÃO URBANA E USO SUSTENTÁVEL',
	MPEN: 'PRESERVAÇÃO DE ECOSSISTEMAS NATURAIS',
};

/** Uppercase sem acento, espaços colapsados — chave de comparação tolerante. */
function chave(valor: string): string {
	return valor
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function construirLookup<T extends string>(
	canonicos: readonly T[],
	aliases: Record<string, T> = {},
): Map<string, T> {
	const mapa = new Map<string, T>();
	for (const c of canonicos) mapa.set(chave(c), c);
	for (const [alias, canonico] of Object.entries(aliases)) {
		mapa.set(chave(alias), canonico);
	}
	return mapa;
}

const LOOKUP_MACROAREA = construirLookup(MACROAREAS, SIGLA_PARA_MACROAREA);

const LOOKUP_SUBSETOR = construirLookup(SUBSETORES, {
	'ARCO DE PINHEIROS': 'ARCO PINHEIROS',
	CENTRO: 'SETOR CENTRAL',
	'CENTRO HISTÓRICO': 'SETOR CENTRAL',
});

const LOOKUP_MACROZONA = construirLookup(MACROZONAS);

/**
 * Normaliza a macroárea para o texto canônico. Aceita nome (`nm_macroarea`) e,
 * como fallback, a sigla (`sg_macroarea`). Retorna o valor original quando não
 * reconhecido (para não descartar dados), ou undefined se vazio.
 */
export function normalizarMacroarea(
	nome?: string | null,
	sigla?: string | null,
): string | undefined {
	const bruto = nome?.trim();
	if (bruto) {
		// A camada GeoSampa nomeia como "MACROAREA DE <nome>"; remove o prefixo.
		const semPrefixo = chave(bruto).replace(/^MACROAREA (DE |D[AO]S? )?/, '');
		const canonico =
			LOOKUP_MACROAREA.get(chave(bruto)) ?? LOOKUP_MACROAREA.get(semPrefixo);
		if (canonico) return canonico;
	}
	const sig = sigla?.trim();
	if (sig) {
		const porSigla = SIGLA_PARA_MACROAREA[chave(sig)];
		if (porSigla) return porSigla;
	}
	return bruto || undefined;
}

/** Deriva a macrozona a partir da macroárea (canônica ou não). */
export function macrozonaDeMacroarea(macroarea?: string | null): string | undefined {
	const canonica = normalizarMacroarea(macroarea);
	if (!canonica) return undefined;
	return MACROAREA_PARA_MACROZONA[canonica as Macroarea];
}

/** Normaliza a macrozona diretamente (quando já vem preenchida). */
export function normalizarMacrozona(valor?: string | null): string | undefined {
	const bruto = valor?.trim();
	if (!bruto) return undefined;
	return LOOKUP_MACROZONA.get(chave(bruto)) ?? bruto;
}

/**
 * Normaliza o subsetor para o texto canônico. Ausência de subsetor equivale a
 * 'NA' (fora de operação urbana). Retorna o valor original quando não
 * reconhecido.
 */
export function normalizarSubsetor(valor?: string | null): string {
	const bruto = valor?.trim();
	if (!bruto) return 'NA';
	return LOOKUP_SUBSETOR.get(chave(bruto)) ?? bruto;
}
