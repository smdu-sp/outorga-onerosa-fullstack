/**
 * Investigação das parcelas da Cota de Solidariedade (tela de DEV): lista os
 * processos com Cota (parcela obrigacao=COTA ou ficha de monitoramento da Cota),
 * todas as parcelas COTA de cada um e compara a soma com o valor calculado da ficha.
 *
 * Suspeita sob investigação: a planilha de controle não registra a entrada de 50%
 * da Cota — só o saldo parcelado —, então a soma das parcelas fica em ~50% do
 * valor calculado.
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import { dataCivilHoje } from '@/lib/datas';
import { classificarSituacaoPagamento, type SituacaoPagamento } from '@/lib/antecipacao';
import { planoCotaTemEntrada } from '@/lib/cota/entrada';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Tolerância relativa para considerar dois valores "iguais" (arredondamento de centavos). */
const TOL = 0.02;

export type PadraoParcelas =
	| 'SEM_PARCELAS'
	| 'UNICA'
	| 'IGUAIS'
	| 'ENTRADA_50'
	| 'OUTRO';

export type ComparacaoFicha = 'SEM_FICHA' | 'BATE_100' | 'BATE_50' | 'DIVERGE';

export const PADROES: PadraoParcelas[] = ['SEM_PARCELAS', 'UNICA', 'IGUAIS', 'ENTRADA_50', 'OUTRO'];
export const COMPARACOES: ComparacaoFicha[] = ['BATE_50', 'BATE_100', 'DIVERGE', 'SEM_FICHA'];

export interface ParcelaCota {
	id: string;
	numParcela: number;
	valor: number;
	vencimento: string;
	dataQuitacao: string | null;
	situacao: SituacaoPagamento;
	cpfCnpj: string | null;
}

export interface ProcessoCota {
	processoId: string;
	numProcesso: string;
	tipo: string | null;
	parcelas: ParcelaCota[];
	soma: number;
	pago: number;
	padrao: PadraoParcelas;
	comparacao: ComparacaoFicha;
	/** Valor calculado apresentado no processo (ficha de monitoramento). */
	valorCalculado: number | null;
	estimativaFundurb: number | null;
	valorPagoFicha: number | null;
	valorDevidoFicha: number | null;
	situacaoCota: string | null;
	modalidade: string | null;
	/** soma / valorCalculado. */
	razao: number | null;
	/** Nº de parcelas de outras obrigações (OODC/AIU) no mesmo processo. */
	outrasObrigacoes: number;
	/** Data de referência: 1º vencimento COTA; sem parcelas, a data de entrada do processo. */
	dataReferencia: string | null;
	ultimoVencimento: string | null;
}

export const ORDENS = ['data_desc', 'data_asc', 'soma_desc', 'razao_asc'] as const;
export type OrdemCota = (typeof ORDENS)[number];

export interface FiltroCota {
	padrao?: PadraoParcelas;
	comparacao?: ComparacaoFicha;
	busca?: string;
	/** Intervalo (YYYY-MM-DD, inclusivo) sobre a data de referência. */
	de?: string;
	ate?: string;
	ordem?: OrdemCota;
}

export interface ResultadoCota {
	hoje: string;
	total: number;
	porPadrao: Record<PadraoParcelas, number>;
	porComparacao: Record<ComparacaoFicha, number>;
	processos: ProcessoCota[];
}

const quase = (a: number, b: number) => b !== 0 && Math.abs(a - b) / Math.abs(b) < TOL;

function padraoDe(valores: number[]): PadraoParcelas {
	if (valores.length === 0) return 'SEM_PARCELAS';
	if (valores.length === 1) return 'UNICA';
	if (valores.every((v) => quase(v, valores[0]))) return 'IGUAIS';
	// Entrada de 50% registrada como uma das parcelas (nas planilhas novas costuma vir
	// numerada por último, com vencimento anterior às demais).
	if (planoCotaTemEntrada(valores)) return 'ENTRADA_50';
	return 'OUTRO';
}

function comparacaoDe(soma: number, calc: number | null): ComparacaoFicha {
	if (!calc) return 'SEM_FICHA';
	if (quase(soma, calc)) return 'BATE_100';
	if (quase(soma, calc / 2)) return 'BATE_50';
	return 'DIVERGE';
}

const num = (v: { toString(): string } | null | undefined) => (v == null ? null : Number(v.toString()));

export async function processosCota(filtro: FiltroCota): Promise<ResultadoCota> {
	const hoje = dataCivilHoje();
	const rows = await prisma.processo.findMany({
		where: { OR: [{ parcelas: { some: { obrigacao: 'COTA' } } }, { monitoramento_cota: { isNot: null } }] },
		select: {
			id: true,
			num_processo: true,
			tipo: true,
			data_entrada: true,
			parcelas: {
				select: {
					id: true,
					obrigacao: true,
					num_parcela: true,
					valor: true,
					vencimento: true,
					data_quitacao: true,
					status_quitacao: true,
					quebra: true,
					cpf_cnpj: true,
				},
				orderBy: [{ num_parcela: 'asc' }, { vencimento: 'asc' }],
			},
			monitoramento_cota: {
				select: {
					valor_calculado_processo: true,
					estimativa_deposito_fundurb: true,
					valor_pago: true,
					valor_devido: true,
					situacao_cota: true,
					modalidade: true,
				},
			},
		},
	});

	const todos: ProcessoCota[] = rows.map((r) => {
		const cota = r.parcelas.filter((p) => p.obrigacao === 'COTA');
		const parcelas: ParcelaCota[] = cota.map((p) => ({
			id: p.id,
			numParcela: p.num_parcela,
			valor: p.valor,
			vencimento: iso(p.vencimento),
			dataQuitacao: p.data_quitacao ? iso(p.data_quitacao) : null,
			situacao: classificarSituacaoPagamento(
				{ vencimento: p.vencimento, dataQuitacao: p.data_quitacao, quitada: p.status_quitacao, quebra: p.quebra },
				hoje,
			).situacao,
			cpfCnpj: p.cpf_cnpj,
		}));
		const soma = cota.reduce((s, p) => s + p.valor, 0);
		const pago = cota.filter((p) => p.status_quitacao).reduce((s, p) => s + p.valor, 0);
		const f = r.monitoramento_cota;
		const valorCalculado = num(f?.valor_calculado_processo);
		const vencs = parcelas.map((p) => p.vencimento).sort();
		return {
			processoId: r.id,
			numProcesso: r.num_processo,
			tipo: r.tipo,
			parcelas,
			soma,
			pago,
			padrao: padraoDe(cota.map((p) => p.valor)),
			comparacao: comparacaoDe(soma, valorCalculado),
			valorCalculado,
			estimativaFundurb: num(f?.estimativa_deposito_fundurb),
			valorPagoFicha: num(f?.valor_pago),
			valorDevidoFicha: num(f?.valor_devido),
			situacaoCota: f?.situacao_cota ?? null,
			modalidade: f?.modalidade ?? null,
			razao: valorCalculado ? soma / valorCalculado : null,
			outrasObrigacoes: r.parcelas.length - cota.length,
			dataReferencia: vencs[0] ?? (r.data_entrada ? iso(r.data_entrada) : null),
			ultimoVencimento: vencs.at(-1) ?? null,
		};
	});

	const porPadrao = Object.fromEntries(PADROES.map((p) => [p, 0])) as Record<PadraoParcelas, number>;
	const porComparacao = Object.fromEntries(COMPARACOES.map((c) => [c, 0])) as Record<ComparacaoFicha, number>;
	for (const p of todos) {
		porPadrao[p.padrao]++;
		porComparacao[p.comparacao]++;
	}

	const busca = filtro.busca?.replace(/\D/g, '');
	const { de, ate } = filtro;
	// Sem data vai sempre para o fim, em qualquer sentido.
	const porData = (dir: 1 | -1) => (a: ProcessoCota, b: ProcessoCota) =>
		!a.dataReferencia ? 1 : !b.dataReferencia ? -1 : dir * a.dataReferencia.localeCompare(b.dataReferencia);
	const comparadores: Record<OrdemCota, (a: ProcessoCota, b: ProcessoCota) => number> = {
		data_desc: porData(-1),
		data_asc: porData(1),
		soma_desc: (a, b) => b.soma - a.soma,
		razao_asc: (a, b) => (a.razao ?? Infinity) - (b.razao ?? Infinity),
	};
	const processos = todos
		.filter((p) => !filtro.padrao || p.padrao === filtro.padrao)
		.filter((p) => !filtro.comparacao || p.comparacao === filtro.comparacao)
		.filter((p) => !busca || p.numProcesso.includes(busca))
		.filter((p) => (!de && !ate) || (!!p.dataReferencia && (!de || p.dataReferencia >= de) && (!ate || p.dataReferencia <= ate)))
		.sort(comparadores[filtro.ordem ?? 'data_desc']);

	return { hoje: iso(hoje), total: todos.length, porPadrao, porComparacao, processos };
}
