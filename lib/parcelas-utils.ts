import type { IParcela } from '@/types/processo';

export type IParcelaView = IParcela & {
	quebra?: boolean;
	antecipada?: boolean;
};

export type StatusPagamentoParcelas = 'EM_PAGAMENTO' | 'QUITADO' | 'QUEBRA';

export function recalcularStatusPagamento(
	parcelas: { status_quitacao?: boolean; quebra?: boolean }[],
): StatusPagamentoParcelas {
	if (parcelas.some((p) => p.quebra)) return 'QUEBRA';
	if (parcelas.length > 0 && parcelas.every((p) => p.status_quitacao)) return 'QUITADO';
	return 'EM_PAGAMENTO';
}

export function parcelaAntecipada(parcela: {
	status_quitacao?: boolean;
	data_quitacao?: Date | string | null;
	vencimento: Date | string;
}): boolean {
	if (!parcela.status_quitacao || !parcela.data_quitacao) return false;
	const quitacao = new Date(parcela.data_quitacao);
	const vencimento = new Date(parcela.vencimento);
	quitacao.setHours(0, 0, 0, 0);
	vencimento.setHours(0, 0, 0, 0);
	return quitacao < vencimento;
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
