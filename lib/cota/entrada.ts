/**
 * Entrada da Cota de Solidariedade: o munícipe paga 50% de entrada e pode parcelar o
 * saldo (ou paga tudo à vista). A planilha antiga de controle só registrou o saldo,
 * então muitos planos importados não têm a entrada.
 *
 * @format
 */

/** Tolerância relativa para comparar valores (arredondamento de centavos). */
const TOL = 0.02;

const quase = (a: number, b: number) => b !== 0 && Math.abs(a - b) / Math.abs(b) < TOL;

/** Valor da entrada: ROUNDUP(total × 50%; 2), como na planilha UC-CO. */
export function valorEntradaCota(total: number): number {
	return Math.ceil(Math.round(total * 50 * 100) / 100) / 100;
}

/**
 * O plano tem uma parcela de entrada (≈ 50% da soma ou do valor calculado)?
 * Parcela única conta como pagamento à vista.
 */
export function planoCotaTemEntrada(valores: number[], valorCalculado?: number | null): boolean {
	if (valores.length <= 1) return true;
	const soma = valores.reduce((s, v) => s + v, 0);
	return valores.some((v) => quase(v, soma / 2) || (!!valorCalculado && quase(v, valorCalculado / 2)));
}
