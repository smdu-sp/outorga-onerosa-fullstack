import type { IParcela } from '@/types/processo';
import { dataCivilDiasAtras, dataCivilHoje } from '@/lib/datas';

export type IParcelaView = IParcela;

export type StatusPagamentoParcelas = 'EM_PAGAMENTO' | 'QUITADO' | 'QUEBRA';

/** Dias usados quando a parcela não tem vencimento informado. */
export const VENCIMENTO_FALLBACK_DIAS = 30;

/** Parcela com campos usados para classificar arrecadação por período. */
export type ParcelaArrecadacao = {
	status_quitacao: boolean;
	vencimento?: Date | null;
	data_quitacao?: Date | null;
	ano_pagamento?: number | null;
	antecipada?: boolean;
};

export type FiltroArrecadacao = {
	ano?: number;
	/** 0 = janeiro … 11 = dezembro */
	mes?: number;
};

/** Vencimento efetivo: o informado ou, se ausente, hoje − 30 dias. */
export function vencimentoEfetivo(
	vencimento?: Date | null,
	referencia: Date = dataCivilDiasAtras(VENCIMENTO_FALLBACK_DIAS),
): Date {
	return vencimento ?? referencia;
}

/**
 * Data em que o valor entrou (pagamento efetivo).
 *
 * Regra: parcela quitada sem `data_quitacao` → considera a data de vencimento
 * como data de pagamento, **exceto se o vencimento estiver no futuro** (não
 * inventar pagamento futuro). Sem vencimento utilizável → hoje − 30 dias.
 */
export function dataPagamentoParcela(p: ParcelaArrecadacao): Date | null {
	if (!p.status_quitacao) return null;
	const hoje = dataCivilHoje();
	if (p.data_quitacao && p.data_quitacao.getTime() <= hoje.getTime()) {
		return p.data_quitacao;
	}
	const venc = vencimentoEfetivo(p.vencimento);
	if (venc.getTime() <= hoje.getTime()) return venc;
	return null;
}

/** Ano de arrecadação a partir da data de pagamento efetiva (ou proxy no vencimento). */
export function anoArrecadacaoParcela(p: ParcelaArrecadacao): number | null {
	const pagamento = dataPagamentoParcela(p);
	if (pagamento) return pagamento.getFullYear();
	if (p.ano_pagamento != null) return p.ano_pagamento;
	return null;
}

/** Mês de arrecadação (0–11) a partir da data de pagamento efetiva (ou proxy no vencimento). */
export function mesArrecadacaoParcela(p: ParcelaArrecadacao): number | null {
	const pagamento = dataPagamentoParcela(p);
	return pagamento ? pagamento.getMonth() : null;
}

/**
 * Parcela quitada entra no período pela data de pagamento, não pelo vencimento
 * contratual — salvo quando a data de quitação falta, caso em que o vencimento
 * (ou hoje − 30 dias, se também faltar) é o proxy.
 */
export function parcelaArrecadadaNoPeriodo(
	p: ParcelaArrecadacao,
	filtro: FiltroArrecadacao = {},
): boolean {
	if (!p.status_quitacao) return false;

	if (filtro.ano == null && filtro.mes == null) return true;

	if (filtro.mes != null) {
		const pagamento = dataPagamentoParcela(p);
		if (!pagamento) return false;
		if (filtro.ano != null && pagamento.getFullYear() !== filtro.ano) return false;
		return pagamento.getMonth() === filtro.mes;
	}

	if (filtro.ano != null) {
		const ano = anoArrecadacaoParcela(p);
		return ano === filtro.ano;
	}

	return true;
}

export function recalcularStatusPagamento(
	parcelas: { status_quitacao?: boolean; quebra?: boolean }[],
): StatusPagamentoParcelas {
	if (parcelas.some((p) => p.quebra)) return 'QUEBRA';
	if (parcelas.length > 0 && parcelas.every((p) => p.status_quitacao)) return 'QUITADO';
	return 'EM_PAGAMENTO';
}

export function parcelaAntecipada(parcela: { antecipada?: boolean }): boolean {
	return parcela.antecipada === true;
}

export function enriquecerParcela(parcela: IParcela): IParcelaView {
	return {
		...parcela,
		antecipada: parcelaAntecipada(parcela),
	};
}

export function enriquecerParcelas(parcelas: IParcela[]): IParcelaView[] {
	return parcelas.map(enriquecerParcela);
}
