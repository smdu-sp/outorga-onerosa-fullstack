export function parseSqlParaLocalizacao(sql: string) {
	const match = sql.trim().match(/^(\d{3})\.(\d{3})\.(\d{4})-(\d)$/);
	if (!match) return null;
	const [, setor, quadra, lote, digito] = match;
	return { setor, quadra, lote_cadastrado: `${lote}-${digito}` };
}
