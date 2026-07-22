/**
 * Parser de números em formato brasileiro (separador de milhar ".", decimal ",").
 *
 * Extraído de `prisma/import-planilhas.ts` para virar fonte única, reutilizada
 * tanto na importação quanto na normalização dos campos monetários/área que
 * eram armazenados como texto e passaram a `Decimal` no schema.
 */

/** Limpa texto: remove NBSP, normaliza espaços e trata vazio/"nan". */
export function limparTexto(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	const text = String(value).replace(/ /g, ' ').trim();
	if (!text || text.toLowerCase() === 'nan') return undefined;
	return text;
}

/**
 * Converte texto em formato BR (ou um `number`) para `number`.
 * Retorna `undefined` para vazio, "-" ou valores não numéricos.
 */
export function parseNumeroBr(value: unknown): number | undefined {
	if (value === null || value === undefined || value === '') return undefined;
	if (typeof value === 'number') return isNaN(value) ? undefined : value;
	const text = limparTexto(value);
	if (!text || text === '-') return undefined;
	const normalized = text
		.replace(/R\$\s?/gi, '')
		.replace(/\./g, '')
		.replace(',', '.')
		.replace(/[^\d.-]/g, '');
	const num = Number(normalized);
	return isNaN(num) ? undefined : num;
}

/**
 * Normaliza um valor BR para texto canônico `1234.56` (ponto decimal, sem
 * separador de milhar) — pronto para o MySQL castar em `DECIMAL`. Vazio/"-"/
 * não numérico viram `null`.
 */
export function paraTextoDecimal(value: unknown): string | null {
	const num = parseNumeroBr(value);
	return num === undefined ? null : String(num);
}
