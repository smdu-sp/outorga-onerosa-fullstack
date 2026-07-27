/**
 * Um processo é "novo" quando veio do fluxo de cálculo do Técnico (origem PORTAL,
 * criado por alguém) e o CAP ainda não cadastrou nenhuma parcela nele. Deixa de ser
 * "novo" assim que a 1ª parcela é criada — não precisa de campo de estado à parte.
 */
export function processoEhNovo(processo: {
	origem?: string | null;
	criado_por?: string | null;
	parcelas?: unknown[];
}): boolean {
	return (
		processo.origem === 'PORTAL' &&
		Boolean(processo.criado_por) &&
		(processo.parcelas?.length ?? 0) === 0
	);
}
