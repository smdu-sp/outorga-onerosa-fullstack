export function verificaPagina(pagina: number, limite: number): [number, number] {
	if (!pagina || pagina < 1) pagina = 1;
	if (!limite || limite < 1) limite = 10;
	return [pagina, limite];
}

export function verificaLimite(
	pagina: number,
	limite: number,
	total: number,
): [number, number] {
	if ((pagina - 1) * limite >= total) pagina = Math.ceil(total / limite) || 1;
	return [pagina, limite];
}
