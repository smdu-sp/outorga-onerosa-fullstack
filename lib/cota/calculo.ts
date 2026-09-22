/**
 * Motor de cálculo da Cota de Solidariedade (art. 112 da Lei 16.050/2014 e Decreto
 * 56.538/2015) — porta fiel das fórmulas da aba `Cota de Solidariedade` da planilha
 * oficial `UC-CO-V2023_02_16-LEI-16050-desbloqueada.xlsm`:
 *
 * - Terreno usado = SMALL(área escritura, área real; 1) — o menor dos dois.
 * - Vm² usado = LARGE(valores encontrados nos até 6 endereços; 1) — o maior deles.
 * - Valor TOTAL = ROUNDUP(0,10 × terreno usado × Vm²; 2).
 * - Valor dos 50% (Alvará de Execução) = ROUNDUP(valor total × 0,50; 2).
 *
 * Funções puras, sem I/O — a busca do Vm² é feita à parte em
 * `lib/server/cota-valor-referencia.ts` e passada já resolvida.
 */

import type { EntradaCalculoCota, ResultadoCalculoCota, ValorUnitarioEncontradoCota } from './tipos';

function paraNumero(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

/** ROUNDUP(n; 2) do Excel — arredonda para cima (afastando de zero), 2 casas. */
export function arredondarParaCima2Casas(n: number): number {
	if (!Number.isFinite(n) || n === 0) return 0;
	const sinal = n < 0 ? -1 : 1;
	const escalado = Math.abs(n) * 100;
	// corrige ruído de ponto flutuante (ex.: 12.000000000000002) antes do ceil
	const ajustado = Math.round(escalado * 1e6) / 1e6;
	return (sinal * Math.ceil(ajustado)) / 100;
}

/** Ponto de entrada único: orquestra o memorial de cálculo da Cota de Solidariedade. */
export function calcularCota(
	entrada: EntradaCalculoCota,
	vMax: number | null,
	valoresUnitariosEncontrados: ValorUnitarioEncontradoCota[],
): ResultadoCalculoCota {
	const areaEscritura = paraNumero(entrada.areaTerrenoEscrituraM2);
	const areaReal = paraNumero(entrada.areaTerrenoRealM2);
	const candidatos = [areaEscritura, areaReal].filter((v) => v > 0);
	const terrenoUsadoM2 = candidatos.length ? Math.min(...candidatos) : 0;

	const vMaxEfetivo = vMax ?? 0;
	const valorTotalRs =
		terrenoUsadoM2 > 0 && vMaxEfetivo > 0
			? arredondarParaCima2Casas(0.1 * terrenoUsadoM2 * vMaxEfetivo)
			: 0;
	const valorCinquentaPctRs = valorTotalRs > 0 ? arredondarParaCima2Casas(valorTotalRs * 0.5) : 0;

	return {
		vMax,
		valoresUnitariosEncontrados,
		terrenoUsadoM2,
		valorTotalRs,
		valorCinquentaPctRs,
	};
}
