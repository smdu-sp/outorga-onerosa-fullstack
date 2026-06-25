/** Normaliza nome de distrito para comparação entre banco e GeoJSON. */
export function normalizarDistrito(nome: string): string {
	return nome
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();
}

export function tituloDistrito(nome: string): string {
	return nome
		.toLowerCase()
		.split(/(\s+|[-/])/)
		.map((part) => (/^\s+$|[-/]/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');
}
