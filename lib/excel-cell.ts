/**
 * Utilidades para lidar com valores brutos de célula do exceljs.
 *
 * Planilhas lidas via exceljs guardam valores como texto/número/Date simples,
 * mas também como objetos: rich text (`{ richText: [...] }`), resultado de
 * fórmula (`{ result: ... }`) ou hyperlink (`{ text: ... }`). Datas sem
 * formatação de data na célula chegam como número de série do Excel, não como
 * `Date`. Ver projeto/contexto-dominio.md §5.
 */

/** Desembrulha o valor bruto de uma célula (richText / fórmula / hyperlink). */
export function desembrulharCelula(valor: unknown): unknown {
	if (valor === null || valor === undefined) return undefined;
	if (typeof valor === 'object' && !(valor instanceof Date)) {
		const obj = valor as Record<string, unknown>;
		if (Array.isArray(obj.richText)) {
			return (obj.richText as Array<{ text?: unknown }>)
				.map((parte) => parte?.text ?? '')
				.join('');
		}
		if ('result' in obj) return obj.result;
		if ('text' in obj) return obj.text;
	}
	return valor;
}

/** Converte um número de série de data do Excel (base 1899-12-30) em `Date` (UTC, meia-noite). */
export function serialExcelParaData(serial: number): Date | undefined {
	if (!Number.isFinite(serial)) return undefined;
	const data = new Date(Date.UTC(1899, 11, 30));
	data.setUTCDate(data.getUTCDate() + Math.floor(serial));
	return data;
}
