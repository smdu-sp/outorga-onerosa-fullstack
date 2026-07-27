/**
 * Normalização do status ("Situação") das parcelas das planilhas de Outorga.
 *
 * Fonte única, reutilizada pela importação e por scripts de normalização. O
 * preenchimento é manual e inconsistente: mistura caixa e acentos
 * (`Pago`/`Quitado`, `A Vencer`/`A VENCER`, `Quebra`/`QUEBRA`) e ainda traz
 * lixo vazado na coluna — datas e objetos (`[object Object]`). Ver
 * `projeto/contexto-dominio.md` §5.
 */

/** Status canônico de uma parcela. `INDEFINIDO` = célula ilegível/vazia/lixo. */
export type SituacaoParcela = 'QUITADO' | 'A_VENCER' | 'QUEBRA' | 'INDEFINIDO';

/**
 * Desembrulha o valor bruto de uma célula. Planilhas (via exceljs) guardam status
 * como texto simples, mas também como *rich text* (`{ richText: [...] }`, ex.: um
 * "Pago" colorido) ou como resultado de fórmula (`{ result: ... }`). Retorna o
 * valor "cru" por baixo dessas embalagens.
 */
function desembrulhar(valor: unknown): unknown {
	if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
		const obj = valor as Record<string, unknown>;
		if (Array.isArray(obj.richText)) {
			return (obj.richText as Array<{ text?: unknown }>)
				.map((parte) => parte?.text ?? '')
				.join('');
		}
		if ('result' in obj) return obj.result; // fórmula: usa o resultado calculado
		if ('text' in obj) return obj.text; // hyperlink / texto simples embrulhado
	}
	return valor;
}

/** Texto em caixa alta, sem acento e sem espaços redundantes; `undefined` para lixo. */
function textoBase(valor: unknown): string | undefined {
	const bruto = desembrulhar(valor);
	if (bruto === null || bruto === undefined) return undefined;
	// Data vazada na coluna Situação (inclusive resultado de fórmula) não é status.
	if (bruto instanceof Date) return undefined;
	if (typeof bruto === 'object') return undefined;
	const texto = String(bruto)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // remove acentos
		.replace(/ /g, ' ') // NBSP -> espaço
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();
	return texto || undefined;
}

/**
 * Classifica a Situação bruta da planilha em um status canônico.
 * Ordem importa: QUEBRA vence PAGO (uma parcela quebrada pode ter sido paga antes).
 */
export function normalizarSituacaoParcela(valor: unknown): SituacaoParcela {
	const texto = textoBase(valor);
	if (!texto) return 'INDEFINIDO';
	if (texto.includes('QUEBRA')) return 'QUEBRA';
	if (texto.includes('QUITADO') || texto.includes('PAGO') || texto.includes('VISTA'))
		return 'QUITADO';
	if (
		texto.includes('VENCER') || // "A Vencer"
		texto.includes('VENCEU') || // vencida não paga
		texto.includes('VENCID') || // "vencido"
		texto.includes('ABERTO') ||
		texto.includes('PENDENTE')
	)
		return 'A_VENCER';
	return 'INDEFINIDO';
}

/**
 * Parcela paga? `true` = quitada, `false` = não quitada (a vencer/quebra),
 * `undefined` = não foi possível classificar (célula ilegível).
 */
export function situacaoQuitada(valor: unknown): boolean | undefined {
	const status = normalizarSituacaoParcela(valor);
	if (status === 'QUITADO') return true;
	if (status === 'A_VENCER' || status === 'QUEBRA') return false;
	return undefined;
}

/** A Situação bruta indica quebra? */
export function situacaoEmQuebra(valor: unknown): boolean {
	return normalizarSituacaoParcela(valor) === 'QUEBRA';
}
