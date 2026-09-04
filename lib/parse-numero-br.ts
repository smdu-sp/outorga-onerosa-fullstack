/**
 * Parser de números em formato brasileiro (separador de milhar ".", decimal ",").
 *
 * Extraído de `prisma/import-planilhas.ts` para virar fonte única, reutilizada
 * tanto na importação quanto na normalização dos campos monetários/área que
 * eram armazenados como texto e passaram a `Decimal` no schema.
 */

import { desembrulharCelula } from './excel-cell';

/** Limpa texto: remove NBSP, normaliza espaços e trata vazio/"nan". */
export function limparTexto(value: unknown): string | undefined {
	const bruto = desembrulharCelula(value);
	if (bruto === null || bruto === undefined) return undefined;
	const text = String(bruto).replace(/ /g, ' ').trim();
	if (!text || text.toLowerCase() === 'nan') return undefined;
	return text;
}

/**
 * Converte texto em formato BR (ou um `number`) para `number`.
 * Retorna `undefined` para vazio, "-" ou valores não numéricos.
 */
export function parseNumeroBr(value: unknown): number | undefined {
	const bruto = desembrulharCelula(value);
	if (bruto === null || bruto === undefined || bruto === '') return undefined;
	if (typeof bruto === 'number') return isNaN(bruto) ? undefined : bruto;
	const text = limparTexto(bruto);
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
