import { Prisma } from '@prisma/client';

/**
 * Pendências de dados que afetam os cálculos dos relatórios. Cada código
 * corresponde a um campo essencial que, quando ausente, exclui ou degrada o
 * processo em algum relatório. A regra vive aqui para ser reusada tanto no
 * mapper da lista (badge por linha) quanto no filtro server-side (where Prisma).
 */
export type CodigoPendencia =
	| 'FALTA_DISTRITO'
	| 'FALTA_SUBPREFEITURA'
	| 'SEM_PARCELAS'
	| 'FALTA_ZONA'
	| 'FALTA_TIPO'
	| 'SEM_DATA_QUITACAO';

export type SeveridadePendencia = 'critica' | 'atencao';

export interface PendenciaMeta {
	label: string;
	descricao: string;
	severidade: SeveridadePendencia;
}

export const PENDENCIAS_META: Record<CodigoPendencia, PendenciaMeta> = {
	FALTA_DISTRITO: {
		label: 'Falta distrito',
		descricao:
			'Sem distrito na ficha, o processo não aparece nos rankings e mapas por distrito. Só é lido da ficha PDE — se estiver preenchido apenas na cota, ainda fica de fora.',
		severidade: 'critica',
	},
	FALTA_SUBPREFEITURA: {
		label: 'Falta subprefeitura',
		descricao:
			'Sem subprefeitura na ficha, o processo some do ranking de subprefeituras e da tabela de risco da Saúde da arrecadação. Só é lido da ficha PDE — não da cota.',
		severidade: 'critica',
	},
	SEM_PARCELAS: {
		label: 'Sem parcelas',
		descricao:
			'Sem nenhuma parcela cadastrada, o processo é excluído de toda a arrecadação (o universo dos relatórios são as parcelas).',
		severidade: 'critica',
	},
	FALTA_ZONA: {
		label: 'Falta zona de uso',
		descricao:
			'Sem nenhuma zona de uso na ficha, o processo cai em "Não informado" no relatório de zonas.',
		severidade: 'atencao',
	},
	FALTA_TIPO: {
		label: 'Falta tipo',
		descricao:
			'Sem o tipo do processo, ele é tratado como PDE/Outorga por padrão, o que distorce as quebras por tipo.',
		severidade: 'atencao',
	},
	SEM_DATA_QUITACAO: {
		label: 'Sem data de quitação',
		descricao:
			'Há parcela quitada sem data de quitação — pela regra do sistema, o pagamento é considerado na data de vencimento.',
		severidade: 'atencao',
	},
};

/** Ordem estável para exibição: críticas primeiro. */
export const ORDEM_PENDENCIAS: CodigoPendencia[] = [
	'FALTA_DISTRITO',
	'FALTA_SUBPREFEITURA',
	'SEM_PARCELAS',
	'FALTA_ZONA',
	'FALTA_TIPO',
	'SEM_DATA_QUITACAO',
];

/** Trata null/undefined/''/'—' como vazio (mesma regra de detalhe-nav.ts). */
export function campoVazio(valor: unknown): boolean {
	if (valor === null || valor === undefined || valor === '') return true;
	if (typeof valor === 'string') {
		const t = valor.trim();
		return t === '' || t === '—';
	}
	return false;
}

interface ParcelaPendencia {
	status_quitacao: boolean;
	quebra: boolean;
	data_quitacao: Date | string | null;
}

interface EnquadramentoPendencia {
	distrito: string | null;
	subprefeitura: string | null;
	zona_uso_1_18081: string | null;
	zona_uso_2_17975: string | null;
	zona_uso_3_16402: string | null;
	zona_uso_4_16050: string | null;
	zona_uso_5_13885: string | null;
	zona_uso_6_13885: string | null;
}

export interface DadosPendencia {
	tipo: string | null;
	parcelas: ParcelaPendencia[];
	enquadramento: EnquadramentoPendencia | null;
}

/** Calcula, para um processo, quais pendências de dados de relatório existem. */
export function calcularPendencias(dados: DadosPendencia): CodigoPendencia[] {
	const pendencias: CodigoPendencia[] = [];
	const enq = dados.enquadramento;

	if (campoVazio(enq?.distrito)) pendencias.push('FALTA_DISTRITO');
	if (campoVazio(enq?.subprefeitura)) pendencias.push('FALTA_SUBPREFEITURA');
	if (dados.parcelas.length === 0) pendencias.push('SEM_PARCELAS');

	const semZona =
		!enq ||
		[
			enq.zona_uso_1_18081,
			enq.zona_uso_2_17975,
			enq.zona_uso_3_16402,
			enq.zona_uso_4_16050,
			enq.zona_uso_5_13885,
			enq.zona_uso_6_13885,
		].every(campoVazio);
	if (semZona) pendencias.push('FALTA_ZONA');

	if (campoVazio(dados.tipo)) pendencias.push('FALTA_TIPO');

	const temQuitadaSemData = dados.parcelas.some(
		(p) => p.status_quitacao && !p.quebra && p.data_quitacao == null,
	);
	if (temQuitadaSemData) pendencias.push('SEM_DATA_QUITACAO');

	// Mantém a ordem estável de exibição.
	return ORDEM_PENDENCIAS.filter((c) => pendencias.includes(c));
}

// SQL `col IN (...)` nunca casa NULL, então o vazio é sempre `null OR in ('', '—')`.
const campoVazioWhere = (): Prisma.StringNullableFilter =>
	({ in: ['', '—'] } as Prisma.StringNullableFilter);

/** Fragmento de `where` Prisma que seleciona processos com a pendência dada. */
export function wherePendencia(codigo: CodigoPendencia): Prisma.ProcessoWhereInput {
	switch (codigo) {
		case 'FALTA_TIPO':
			return { tipo: null };
		case 'SEM_PARCELAS':
			return { parcelas: { none: {} } };
		case 'FALTA_DISTRITO':
			return {
				OR: [
					{ monitoramento: null },
					{ monitoramento: { enquadramento_urbanistico: null } },
					{ monitoramento: { enquadramento_urbanistico: { distrito: null } } },
					{
						monitoramento: {
							enquadramento_urbanistico: { distrito: campoVazioWhere() },
						},
					},
				],
			};
		case 'FALTA_SUBPREFEITURA':
			return {
				OR: [
					{ monitoramento: null },
					{ monitoramento: { enquadramento_urbanistico: null } },
					{ monitoramento: { enquadramento_urbanistico: { subprefeitura: null } } },
					{
						monitoramento: {
							enquadramento_urbanistico: { subprefeitura: campoVazioWhere() },
						},
					},
				],
			};
		case 'FALTA_ZONA':
			return {
				OR: [
					{ monitoramento: null },
					{ monitoramento: { enquadramento_urbanistico: null } },
					{
						monitoramento: {
							enquadramento_urbanistico: { AND: ZONAS.map(zonaVaziaWhere) },
						},
					},
				],
			};
		case 'SEM_DATA_QUITACAO':
			return {
				parcelas: {
					some: { status_quitacao: true, quebra: false, data_quitacao: null },
				},
			};
	}
}

const ZONAS = [
	'zona_uso_1_18081',
	'zona_uso_2_17975',
	'zona_uso_3_16402',
	'zona_uso_4_16050',
	'zona_uso_5_13885',
	'zona_uso_6_13885',
] as const;

const zonaVaziaWhere = (
	campo: (typeof ZONAS)[number],
): Prisma.MonitoramentoEnquadramentoUrbanisticoWhereInput => ({
	OR: [{ [campo]: null }, { [campo]: campoVazioWhere() }],
});

/** `where` que seleciona processos com qualquer pendência. */
export function wherePendencias(): Prisma.ProcessoWhereInput {
	return { OR: ORDEM_PENDENCIAS.map(wherePendencia) };
}

const CODIGOS = new Set<string>(ORDEM_PENDENCIAS);
export function isCodigoPendencia(v: string): v is CodigoPendencia {
	return CODIGOS.has(v);
}
