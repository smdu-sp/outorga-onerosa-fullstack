export const RE_SQL = /^\d{3}\.\d{3}\.\d{4}-\d$/;

export function parseSqlParaLocalizacao(sql: string) {
	const match = sql.trim().match(/^(\d{3})\.(\d{3})\.(\d{4})-(\d)$/);
	if (!match) return null;
	const [, setor, quadra, lote, digito] = match;
	return { setor, quadra, lote_cadastrado: `${lote}-${digito}` };
}

export function normalizarSql(valor: string): string | null {
	const trimmed = valor.trim();
	if (RE_SQL.test(trimmed)) return trimmed;

	const semPontos = trimmed.match(/^(\d{3})(\d{3})(\d{4})-(\d)$/);
	if (semPontos) {
		const [, setor, quadra, lote, digito] = semPontos;
		return `${setor}.${quadra}.${lote}-${digito}`;
	}

	const digits = trimmed.replace(/\D/g, '');
	if (digits.length === 11) {
		return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 10)}-${digits.slice(10)}`;
	}

	return null;
}

export function montarSqlDaLocalizacao(loc: {
	setor?: string | null;
	quadra?: string | null;
	lote_cadastrado?: string | null;
}): string | null {
	if (!loc.setor?.trim() || !loc.quadra?.trim() || !loc.lote_cadastrado?.trim()) {
		return null;
	}

	const loteMatch = loc.lote_cadastrado.trim().match(/^(\d{4})-(\d)$/);
	if (!loteMatch) return null;

	const sql = `${loc.setor.trim().padStart(3, '0')}.${loc.quadra.trim().padStart(3, '0')}.${loteMatch[1]}-${loteMatch[2]}`;
	return RE_SQL.test(sql) ? sql : null;
}
