/**
 * Resolve os dados de "de onde vem a outorga" (sistema/origem, empreendimento/endereço,
 * distrito e subprefeitura) a partir da ficha de monitoramento (PDE) ou da ficha de
 * Cota de Solidariedade. Usado nos relatórios por ano e por mês.
 *
 * @format
 */

type FichaEndereco = {
	ordem: number;
	tipo: string | null;
	titulo: string | null;
	nome: string | null;
	numero: string | null;
};

type FichaLike = {
	situacao?: { origem: string | null } | null;
	enderecos?: FichaEndereco[];
	enquadramento_urbanistico?: { distrito: string | null; subprefeitura: string | null } | null;
} | null;

type CotaLike = {
	origem?: string | null;
	endereco?: string | null;
	distrito?: string | null;
	subprefeitura?: string | null;
} | null;

export interface OrigemOutorga {
	/** Origem do processo (SISACOE, SEI, Aprova Digital…) */
	sistema: string | null;
	/** Endereço do empreendimento */
	empreendimento: string | null;
	distrito: string | null;
	subprefeitura: string | null;
}

/** Buckets do gráfico de pizza por sistema de origem. */
export type SistemaOrigemBucket = 'SEI/SISACOE' | 'PORTAL' | 'APROVA DIGITAL' | 'Outros';

function enderecoDaFicha(ficha: FichaLike): string | null {
	const principal = ficha?.enderecos?.find((e) => e.ordem === 1) ?? ficha?.enderecos?.[0];
	if (!principal) return null;
	const partes = [principal.tipo, principal.titulo, principal.nome, principal.numero].filter(
		(p): p is string => Boolean(p),
	);
	return partes.length > 0 ? partes.join(' ') : null;
}

export function resolverOrigemOutorga(ficha: FichaLike, cota: CotaLike): OrigemOutorga {
	return {
		sistema: ficha?.situacao?.origem ?? cota?.origem ?? null,
		empreendimento: enderecoDaFicha(ficha) ?? cota?.endereco ?? null,
		distrito: ficha?.enquadramento_urbanistico?.distrito ?? cota?.distrito ?? null,
		subprefeitura:
			ficha?.enquadramento_urbanistico?.subprefeitura ?? cota?.subprefeitura ?? null,
	};
}

/**
 * Normaliza origem do monitoramento (prioridade) ou do processo para os buckets do relatório.
 */
export function normalizarSistemaOrigem(
	monitoramentoOrigem: string | null | undefined,
	processoOrigem: string | null | undefined,
): SistemaOrigemBucket {
	const raw = (monitoramentoOrigem ?? processoOrigem ?? '')
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, '_');

	if (!raw) return 'Outros';
	if (raw === 'PORTAL' || raw.includes('PORTAL')) return 'PORTAL';
	if (raw === 'APROVA_DIGITAL' || raw === 'APROVADIGITAL' || raw.includes('APROVA')) {
		return 'APROVA DIGITAL';
	}
	if (
		raw === 'SEI' ||
		raw === 'SISACOE' ||
		raw.includes('SISACOE') ||
		raw.includes('SEI')
	) {
		return 'SEI/SISACOE';
	}
	if (raw === 'SLCE' || raw.includes('SLC')) return 'Outros';
	return 'Outros';
}

/** Seleção Prisma para a ficha de monitoramento (PDE) usada por resolverOrigemOutorga. */
export const selectFichaOrigem = {
	situacao: { select: { origem: true } },
	enderecos: { select: { ordem: true, tipo: true, titulo: true, nome: true, numero: true } },
	enquadramento_urbanistico: {
		select: { distrito: true, subprefeitura: true, tipologia_uso_oodc: true },
	},
} as const;

/** Seleção Prisma para a ficha de Cota usada por resolverOrigemOutorga. */
export const selectCotaOrigem = {
	origem: true,
	endereco: true,
	distrito: true,
	subprefeitura: true,
} as const;
