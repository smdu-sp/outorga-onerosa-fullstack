/** Colunas @db.Date — data civil, sem hora. */
export const CAMPOS_DATA_CIVIL = new Set([
	'data_entrada',
	'data_informacao_dmus',
	'ficha_revisada_em',
	'data_expedicao',
	'vencimento',
	'data_quitacao',
]);

/** Converte valor vindo da UI ou do Prisma em Date UTC (meia-noite). */
export function parseDataCivil(valor: unknown): Date | null {
	if (valor === null || valor === undefined || valor === '') return null;

	if (valor instanceof Date) {
		if (Number.isNaN(valor.getTime())) return null;
		return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
	}

	if (typeof valor === 'string') {
		const trimmed = valor.trim();
		if (!trimmed || trimmed === '—') return null;

		const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (iso) {
			const [, y, m, d] = iso;
			return new Date(Date.UTC(+y, +m - 1, +d));
		}

		const parsed = new Date(trimmed);
		if (Number.isNaN(parsed.getTime())) return null;
		return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
	}

	return null;
}

export function formatarDataCivil(valor: unknown): string {
	const data = parseDataCivil(valor);
	if (!data) return '—';
	const day = String(data.getUTCDate()).padStart(2, '0');
	const month = String(data.getUTCMonth() + 1).padStart(2, '0');
	const year = data.getUTCFullYear();
	return `${day}/${month}/${year}`;
}

/** Formato YYYY-MM-DD para `<input type="date">`. */
export function dataCivilParaInput(valor: unknown): string {
	const data = parseDataCivil(valor);
	if (!data) return '';
	const y = data.getUTCFullYear();
	const m = String(data.getUTCMonth() + 1).padStart(2, '0');
	const d = String(data.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function dataCivilHoje(): Date {
	const agora = new Date();
	return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}

export function ehCampoDataCivil(chave: string): boolean {
	return CAMPOS_DATA_CIVIL.has(chave);
}
