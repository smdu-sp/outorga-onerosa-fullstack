/**
 * Auditoria de pagamento de parcelas (tela de DEV): classifica TODAS as parcelas
 * (em dia, antecipada, atrasada, sem data, vencida não paga, a vencer, quebra) com a
 * regra canônica de `lib/antecipacao.ts` e aponta inconsistências para conferência.
 *
 * @format
 */

import { prisma } from '@/lib/prisma';
import { dataCivilHoje } from '@/lib/datas';
import {
	DIAS_TOLERANCIA_VIRADA_MES,
	classificarAntecipacao,
	classificarSituacaoPagamento,
	type MotivoEmDia,
	type SituacaoPagamento,
} from '@/lib/antecipacao';

export const SITUACOES: SituacaoPagamento[] = [
	'ANTECIPADA',
	'EM_DIA',
	'EM_ATRASO',
	'PAGA_SEM_DATA',
	'VENCIDA_NAO_PAGA',
	'A_VENCER',
	'QUEBRA',
];

/** Dias fora dos quais a data de pagamento é suspeita de digitação errada. */
const LIM_ANTES_SUSPEITO = 365;
const LIM_ATRASO_SUSPEITO = 90;
const TOLERANCIAS_SENSIBILIDADE = [0, 3, 5, 7, 10, 15];

export type AlertaAuditoria =
	| 'FLAG_DIVERGE_DA_REGRA'
	| 'PAGO_MUITO_ANTES'
	| 'PAGO_MUITO_DEPOIS'
	| 'QUEBRA_E_PAGA'
	| 'PAGAMENTO_FUTURO'
	| 'PAGAMENTO_ANTES_DO_PROCESSO';

export interface LinhaAuditoria {
	id: string;
	processoId: string;
	numProcesso: string;
	obrigacao: string | null;
	numParcela: number;
	valor: number;
	vencimento: string;
	dataQuitacao: string | null;
	dias: number | null;
	situacao: SituacaoPagamento;
	motivoEmDia?: MotivoEmDia;
	flagAntecipada: boolean;
	alertas: AlertaAuditoria[];
}

export interface FiltroAuditoria {
	situacao?: SituacaoPagamento;
	ano?: number;
	/** Mês do vencimento (1–12). */
	mes?: number;
	obrigacao?: string;
	busca?: string;
	somenteAlertas?: boolean;
	/** Ordenação pelo vencimento (padrão: mais recente primeiro). */
	ordem?: 'asc' | 'desc';
}

export interface ResumoSituacao {
	situacao: SituacaoPagamento;
	parcelas: number;
	valor: number;
}

export interface ResultadoAuditoria {
	hoje: string;
	toleranciaDias: number;
	resumo: ResumoSituacao[];
	totalParcelas: number;
	alertasPorTipo: Partial<Record<AlertaAuditoria, number>>;
	sensibilidade: { tolerancia: number; antecipadas: number }[];
	pagasComData: number;
	linhas: LinhaAuditoria[];
	totalFiltrado: number;
	/** Soma de `valor` de todas as parcelas filtradas (não só da página). */
	valorFiltrado: number;
	pagina: number;
	porPagina: number;
}

/** Ano embutido no nº do processo (SEI 16 dígitos: posições 5-8; físico 12 dígitos: 1-4). */
function anoDoProcesso(num: string): number | null {
	const ano = num.length === 16 ? Number(num.slice(4, 8)) : num.length === 12 ? Number(num.slice(0, 4)) : NaN;
	return ano >= 1990 && ano <= 2100 ? ano : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function auditoriaParcelas(
	filtro: FiltroAuditoria,
	pagina: number,
	porPagina = 100,
): Promise<ResultadoAuditoria> {
	const hoje = dataCivilHoje();
	const parcelas = await prisma.parcela.findMany({
		select: {
			id: true,
			obrigacao: true,
			num_parcela: true,
			valor: true,
			vencimento: true,
			data_quitacao: true,
			status_quitacao: true,
			quebra: true,
			antecipada: true,
			processo: { select: { id: true, num_processo: true, tipo: true } },
		},
		orderBy: [{ vencimento: 'desc' }],
	});

	const resumoMap = new Map<SituacaoPagamento, ResumoSituacao>(
		SITUACOES.map((s) => [s, { situacao: s, parcelas: 0, valor: 0 }]),
	);
	const alertasPorTipo: Partial<Record<AlertaAuditoria, number>> = {};
	const sens = new Map<number, number>(TOLERANCIAS_SENSIBILIDADE.map((t) => [t, 0]));
	let pagasComData = 0;
	const todas: LinhaAuditoria[] = [];

	for (const p of parcelas) {
		const r = classificarSituacaoPagamento(
			{ vencimento: p.vencimento, dataQuitacao: p.data_quitacao, quitada: p.status_quitacao, quebra: p.quebra },
			hoje,
		);
		const alertas: AlertaAuditoria[] = [];
		if (p.status_quitacao && p.data_quitacao) {
			pagasComData++;
			for (const t of TOLERANCIAS_SENSIBILIDADE)
				if (classificarAntecipacao(p.vencimento, p.data_quitacao, t).antecipada) sens.set(t, sens.get(t)! + 1);
			if (p.antecipada !== (r.situacao === 'ANTECIPADA')) alertas.push('FLAG_DIVERGE_DA_REGRA');
			if (r.dias !== null && r.dias > LIM_ANTES_SUSPEITO) alertas.push('PAGO_MUITO_ANTES');
			if (r.dias !== null && r.dias < -LIM_ATRASO_SUSPEITO) alertas.push('PAGO_MUITO_DEPOIS');
			if (p.data_quitacao.getTime() > hoje.getTime()) alertas.push('PAGAMENTO_FUTURO');
			const anoProc = anoDoProcesso(p.processo.num_processo);
			if (anoProc && p.data_quitacao.getUTCFullYear() < anoProc) alertas.push('PAGAMENTO_ANTES_DO_PROCESSO');
		}
		if (p.status_quitacao && p.quebra) alertas.push('QUEBRA_E_PAGA');
		for (const a of alertas) alertasPorTipo[a] = (alertasPorTipo[a] ?? 0) + 1;

		const res = resumoMap.get(r.situacao)!;
		res.parcelas++;
		res.valor += p.valor;

		todas.push({
			id: p.id,
			processoId: p.processo.id,
			numProcesso: p.processo.num_processo,
			obrigacao: p.obrigacao ?? p.processo.tipo ?? null,
			numParcela: p.num_parcela,
			valor: p.valor,
			vencimento: iso(p.vencimento),
			dataQuitacao: p.data_quitacao ? iso(p.data_quitacao) : null,
			dias: r.dias,
			situacao: r.situacao,
			motivoEmDia: r.motivoEmDia,
			flagAntecipada: p.antecipada,
			alertas,
		});
	}

	const busca = filtro.busca?.replace(/\D/g, '');
	const filtradas = todas.filter(
		(l) =>
			(!filtro.situacao || l.situacao === filtro.situacao) &&
			(!filtro.ano || Number(l.vencimento.slice(0, 4)) === filtro.ano) &&
			(!filtro.mes || Number(l.vencimento.slice(5, 7)) === filtro.mes) &&
			(!filtro.obrigacao || l.obrigacao === filtro.obrigacao) &&
			(!busca || l.numProcesso.includes(busca)) &&
			(!filtro.somenteAlertas || l.alertas.length > 0),
	);
	// `todas` já vem por vencimento desc; desempate por processo/parcela para paginação estável.
	const sinal = filtro.ordem === 'asc' ? 1 : -1;
	filtradas.sort(
		(a, b) =>
			sinal * a.vencimento.localeCompare(b.vencimento) ||
			a.numProcesso.localeCompare(b.numProcesso) ||
			a.numParcela - b.numParcela,
	);
	const paginaOk = Math.max(1, Math.min(pagina, Math.ceil(filtradas.length / porPagina) || 1));

	return {
		hoje: iso(hoje),
		toleranciaDias: DIAS_TOLERANCIA_VIRADA_MES,
		resumo: SITUACOES.map((s) => resumoMap.get(s)!),
		totalParcelas: parcelas.length,
		alertasPorTipo,
		sensibilidade: TOLERANCIAS_SENSIBILIDADE.map((t) => ({ tolerancia: t, antecipadas: sens.get(t)! })),
		pagasComData,
		linhas: filtradas.slice((paginaOk - 1) * porPagina, paginaOk * porPagina),
		totalFiltrado: filtradas.length,
		valorFiltrado: filtradas.reduce((s, l) => s + l.valor, 0),
		pagina: paginaOk,
		porPagina,
	};
}
