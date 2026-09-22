/**
 * Tipos de entrada/saída do motor de cálculo da Cota de Solidariedade (art. 112 da
 * Lei 16.050/2014 e Decreto 56.538/2015), espelhando a aba `Cota de Solidariedade` da
 * planilha oficial `UC-CO-V2023_02_16-LEI-16050-desbloqueada.xlsm`.
 */

/** Uma das até 6 linhas de "VALOR M² TERRENO" (setor/quadra/codlog) usadas para achar o Vm². */
export interface EnderecoValorUnitarioCota {
	setor: string;
	quadra: string;
	codlog: string;
}

/** Resultado da busca do Vm² (R$/m²) para um endereço informado — sem vigência por
 * data (o Quadro 14 tem um único valor "2020-atual" por setor/quadra/codlog). */
export interface ValorUnitarioEncontradoCota extends EnderecoValorUnitarioCota {
	valor: number | null;
	observacao: string | null;
}

/** Entrada completa do memorial de cálculo (um "cenário" de teste). */
export interface EntradaCalculoCota {
	/** area_esc — área de terreno conforme escritura (m²). */
	areaTerrenoEscrituraM2: number;
	/** area_real — área de terreno real/medida (m²). */
	areaTerrenoRealM2: number;
	/** até 6 linhas — o "Maior Valor (Vm²)" usa o maior valor encontrado entre elas. */
	enderecos: EnderecoValorUnitarioCota[];
	/** campo informativo do cabeçalho da planilha — não entra na fórmula. */
	anoCalculo?: number;
	/** campo informativo do cabeçalho da planilha — não entra na fórmula. */
	numeroParcelas?: number;
}

/** Resultado calculado do memorial. */
export interface ResultadoCalculoCota {
	vMax: number | null;
	valoresUnitariosEncontrados: ValorUnitarioEncontradoCota[];
	/** menor valor entre escritura/real (SMALL) — o que a fórmula realmente usa. */
	terrenoUsadoM2: number;
	/** ROUNDUP(0,10 × terrenoUsadoM2 × vMax; 2). */
	valorTotalRs: number;
	/** ROUNDUP(valorTotalRs × 0,50; 2) — valor dos 50% para o Alvará de Execução. */
	valorCinquentaPctRs: number;
}
