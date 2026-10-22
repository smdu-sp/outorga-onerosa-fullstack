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

// ---------------------------------------------------------------- situação do pagamento

export type SituacaoPagamento =
	| 'ANTECIPADA'
	| 'EM_DIA'
	| 'EM_ATRASO'
	| 'PAGA_SEM_DATA'
	| 'A_VENCER'
	| 'VENCIDA_NAO_PAGA'
	| 'QUEBRA';

/** Por que uma parcela paga antes do vencimento NÃO é antecipação (ou por que é). */
export type MotivoEmDia = 'NO_DIA' | 'MESMO_MES' | 'VIRADA_DE_MES';

export interface ParcelaParaClassificar {
	vencimento: Date;
	dataQuitacao?: Date | null;
	quitada: boolean;
	quebra: boolean;
}

export interface ResultadoSituacao {
	situacao: SituacaoPagamento;
	/** vencimento − pagamento, em dias (>0 = pago antes; <0 = pago depois). */
	dias: number | null;
	motivoEmDia?: MotivoEmDia;
}

/**
 * Situação completa de pagamento de uma parcela (auditoria/relatórios). Usa a regra
 * canônica de `classificarAntecipacao` para separar ANTECIPADA de EM_DIA; o que a regra
 * não cobre (atraso, sem data, não paga) é decidido aqui.
 *
 * Uma parcela quitada com quebra marcada é tratada como paga (o pagamento prevalece).
 */
export function classificarSituacaoPagamento(
	p: ParcelaParaClassificar,
	hoje: Date,
	toleranciaDias: number = DIAS_TOLERANCIA_VIRADA_MES,
): ResultadoSituacao {
	if (!p.quitada) {
		if (p.quebra) return { situacao: 'QUEBRA', dias: null };
		return { situacao: p.vencimento.getTime() < hoje.getTime() ? 'VENCIDA_NAO_PAGA' : 'A_VENCER', dias: null };
	}
	if (!p.dataQuitacao) return { situacao: 'PAGA_SEM_DATA', dias: null };

	const dias = Math.round((p.vencimento.getTime() - p.dataQuitacao.getTime()) / MS_DIA);
	if (dias < 0) return { situacao: 'EM_ATRASO', dias };
	if (classificarAntecipacao(p.vencimento, p.dataQuitacao, toleranciaDias).antecipada)
		return { situacao: 'ANTECIPADA', dias };
	const motivoEmDia: MotivoEmDia =
		dias === 0 ? 'NO_DIA' : competencia(p.dataQuitacao) === competencia(p.vencimento) ? 'MESMO_MES' : 'VIRADA_DE_MES';
	return { situacao: 'EM_DIA', dias, motivoEmDia };
}
