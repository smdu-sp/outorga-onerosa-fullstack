/**
 * Classificação de antecipação de parcela.
 *
 * Fonte única, reutilizada pela importação, pelos relatórios e por scripts.
 *
 * Regra de domínio: uma parcela é "antecipada" quando o pagamento faz o dinheiro
 * entrar num **mês anterior** ao planejado (mês do vencimento). Pagar poucos dias
 * antes, apenas por virada de mês (ex.: vence 01/07, pago 29/06), **não** é
 * antecipação — é pagamento no prazo. A antecipação real costuma ser de várias
 * parcelas pagas de uma vez, cada uma caindo num mês antes do seu vencimento.
 */

/** Dias antes do vencimento tolerados como "virada de mês" (não é antecipação). */
export const DIAS_TOLERANCIA_VIRADA_MES = 7;

export interface Antecipacao {
	/** Pagamento adiantou o dinheiro para um mês anterior ao do vencimento. */
	antecipada: boolean;
	/** Dias corridos entre pagamento e vencimento (0 se pago no prazo/após). */
	diasAntecipacao: number;
}

const MS_DIA = 86_400_000;

/** Índice ano*12+mês (UTC) para comparar competências independente do dia. */
function competencia(d: Date): number {
	return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/**
 * Classifica a antecipação de uma parcela a partir do vencimento e da data de
 * pagamento. Sem uma das datas, ou pago no prazo/após, retorna não antecipada.
 */
export function classificarAntecipacao(
	vencimento?: Date | null,
	dataPagamento?: Date | null,
	toleranciaDias: number = DIAS_TOLERANCIA_VIRADA_MES,
): Antecipacao {
	if (!vencimento || !dataPagamento) return { antecipada: false, diasAntecipacao: 0 };

	const dias = Math.round((vencimento.getTime() - dataPagamento.getTime()) / MS_DIA);
	if (dias <= 0) return { antecipada: false, diasAntecipacao: 0 }; // no prazo ou em atraso

	// Só é antecipação se o dinheiro caiu num mês anterior ao do vencimento e o
	// adiantamento passou da tolerância de virada de mês.
	const mesAnterior = competencia(dataPagamento) < competencia(vencimento);
	const antecipada = mesAnterior && dias > toleranciaDias;

	return { antecipada, diasAntecipacao: dias };
}
