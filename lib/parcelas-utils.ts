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
	/** Início inclusivo do intervalo livre (data civil). Tem prioridade sobre ano/mês. */
	dataInicio?: Date;
	/** Fim inclusivo do intervalo livre (data civil). Tem prioridade sobre ano/mês. */
	dataFim?: Date;
};

/** True quando o filtro define intervalo livre de datas. */
export function temIntervaloDatas(filtro: FiltroArrecadacao): boolean {
	return filtro.dataInicio != null || filtro.dataFim != null;
}

/** Epoch UTC do dia civil (ignora hora). */
export function diaCivilMs(data: Date): number {
	return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

/** Data civil dentro do intervalo [dataInicio, dataFim] (inclusivo), se informado. */
export function dataNoIntervalo(
	data: Date,
	filtro: Pick<FiltroArrecadacao, 'dataInicio' | 'dataFim'>,
): boolean {
	const t = diaCivilMs(data);
	if (filtro.dataInicio != null && t < diaCivilMs(filtro.dataInicio)) return false;
	if (filtro.dataFim != null && t > diaCivilMs(filtro.dataFim)) return false;
	return true;
}

/**
 * Processo entra no período de contagem (origem/tipologia) pela `data_entrada`.
 * Sem data de entrada → fora do filtro quando há qualquer restrição de período.
 */
export function processoEntradaNoPeriodo(
	dataEntrada: Date | null | undefined,
	filtro: FiltroArrecadacao = {},
): boolean {
	if (!temIntervaloDatas(filtro) && filtro.ano == null && filtro.mes == null) return true;
	if (dataEntrada == null) return false;

	if (temIntervaloDatas(filtro)) {
		return dataNoIntervalo(dataEntrada, filtro);
	}

	if (filtro.mes != null) {
		if (filtro.ano != null && dataEntrada.getUTCFullYear() !== filtro.ano) return false;
		return dataEntrada.getUTCMonth() === filtro.mes;
	}

	if (filtro.ano != null) {
		return dataEntrada.getUTCFullYear() === filtro.ano;
	}

	return true;
}

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
 *
 * Intervalo `dataInicio`/`dataFim` tem prioridade sobre ano/mês.
 */
export function parcelaArrecadadaNoPeriodo(
	p: ParcelaArrecadacao,
	filtro: FiltroArrecadacao = {},
): boolean {
	if (!p.status_quitacao) return false;

	if (temIntervaloDatas(filtro)) {
		const pagamento = dataPagamentoParcela(p);
		if (!pagamento) return false;
		return dataNoIntervalo(pagamento, filtro);
	}

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

/** Vencimento (ou data qualquer) no período — usado em previsto / saúde / ranking. */
export function dataNoPeriodoFiltro(
	data: Date,
	filtro: FiltroArrecadacao = {},
): boolean {
	if (temIntervaloDatas(filtro)) {
		return dataNoIntervalo(data, filtro);
	}
	if (filtro.ano == null && filtro.mes == null) return true;
	if (filtro.mes != null) {
		if (filtro.ano != null && data.getFullYear() !== filtro.ano) return false;
		return data.getMonth() === filtro.mes;
	}
	if (filtro.ano != null) return data.getFullYear() === filtro.ano;
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
