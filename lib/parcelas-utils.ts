import type { IParcela } from '@/types/processo';

export type IParcelaView = IParcela;

export type StatusPagamentoParcelas = 'EM_PAGAMENTO' | 'QUITADO' | 'QUEBRA';

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

/**
 * Data em que o valor entrou (pagamento efetivo).
 * Quando data_quitacao está preenchida, usa ela.
 * Quando só ano_pagamento está disponível (dados importados sem data precisa),
 * usa o vencimento da parcela como proxy — assume pagamento no prazo.
 */
export function dataPagamentoParcela(p: ParcelaArrecadacao): Date | null {
	if (!p.status_quitacao) return null;
	if (p.data_quitacao) return p.data_quitacao;
	if (p.ano_pagamento != null && p.vencimento) return p.vencimento;
	return null;
}

/** Ano de arrecadação: data_quitacao ou, se ausente, ano_pagamento. */
export function anoArrecadacaoParcela(p: ParcelaArrecadacao): number | null {
	const pagamento = dataPagamentoParcela(p);
	if (pagamento) return pagamento.getFullYear();
	if (p.ano_pagamento != null) return p.ano_pagamento;
	return null;
}

/** Mês de arrecadação (0–11); exige data_quitacao. */
export function mesArrecadacaoParcela(p: ParcelaArrecadacao): number | null {
	const pagamento = dataPagamentoParcela(p);
	return pagamento ? pagamento.getMonth() : null;
}

/**
 * Parcela quitada entra no período pela data de pagamento, não pelo vencimento.
 * Filtro por mês exige data_quitacao; filtro só por ano aceita ano_pagamento.
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
