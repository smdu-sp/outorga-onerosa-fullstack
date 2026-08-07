/**
 * Normalização do protocolo Aprova Digital.
 *
 * Na planilha o mesmo pedido aparece de formas distintas:
 *   `#33287-23` | `33287-23-SP-ALV` | `AD: 44005-24-SP-MOD` | `49080/2020`
 *
 * No BI (`dbo.prata_categoria.protocolo`) o canônico é `NNNNN-AA-SP-XXX`
 * (sem `#`, com sufixo de letras). O núcleo estável para match é `NNNNN-AA`.
 */

export type ProtocoloAdNormalizado = {
	/** Texto limpo (sem AD:/#, espaços colapsados). */
	limpo: string;
	/** Núcleo `numero-ano2` (ex.: `33287-23`). */
	nucleo: string | null;
	/** Só dígitos do núcleo (ex.: `3328723`). */
	digitsNucleo: string | null;
};

/** Remove prefixo AD, `#` e lixo de preenchimento. */
export function limparProtocoloAd(raw: string | null | undefined): string | null {
	if (!raw?.trim()) return null;
	let s = raw.replace(/\s+/g, ' ').trim();
	s = s.replace(/^AD\s*[:.\-]?\s*/i, '');
	s = s.replace(/^#+/, '');
	s = s.replace(/\s+/g, ' ').trim();
	return s || null;
}

/**
 * Extrai o núcleo número-ano do protocolo AD.
 * Aceita ano com 2 ou 4 dígitos e separador `-` ou `/`.
 */
export function normalizarProtocoloAd(
	raw: string | null | undefined,
): ProtocoloAdNormalizado | null {
	const limpo = limparProtocoloAd(raw);
	if (!limpo) return null;

	// `33287-23-SP-ALV`, `#33287-23`, `49080/2020`, `33287-23`
	const m = limpo.match(/^(\d{1,6})\s*[-\/]\s*(\d{2,4})\b/);
	if (!m) {
		return { limpo, nucleo: null, digitsNucleo: null };
	}
	const numero = m[1]!;
	let ano = m[2]!;
	if (ano.length === 4) ano = ano.slice(-2);
	const nucleo = `${numero}-${ano}`;
	return {
		limpo,
		nucleo,
		digitsNucleo: `${numero}${ano}`,
	};
}

/** Variantes úteis para exibição / debug. */
export function descricaoProtocoloAd(n: ProtocoloAdNormalizado): string {
	if (n.nucleo && n.limpo !== n.nucleo) return `${n.limpo} → ${n.nucleo}`;
	return n.limpo;
}
