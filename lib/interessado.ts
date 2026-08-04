/**
 * Resolve o nome do interessado a exibir em listagens/relatórios.
 * Ordem: Processo.interessado → ficha → cota → CNPJ → "—".
 * Nunca usa o número do processo como substituto do nome.
 */
export function resolverNomeInteressado(p: {
	interessado?: string | null;
	cnpj?: string | null;
	monitoramento?: { proprietario_interessado?: string | null } | null;
	monitoramento_cota?: { proprietario_interessado?: string | null } | null;
}): string {
	const nome =
		p.interessado?.trim() ||
		p.monitoramento?.proprietario_interessado?.trim() ||
		p.monitoramento_cota?.proprietario_interessado?.trim();
	if (nome) return nome;
	const cnpj = p.cnpj?.trim();
	if (cnpj) return cnpj;
	return '—';
}
