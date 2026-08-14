/** Payload do memorial de cálculo em PDF (sem dependência de pdf-lib). */

export type TipoPdfCalculo = 'OUTORGA' | 'COTA' | 'OUTORGA_COTA' | 'AIU';

export type DadosPdfCalculo = {
	numProcesso: string;
	tipo: TipoPdfCalculo;
	geradoPor?: string;
	proprietario?: string;
	endereco?: string;
	sql?: string;
	setor?: string;
	quadra?: string;
	lote?: string;
	codigoLogradouro?: string;
	distrito?: string;
	subprefeitura?: string;
	zonas?: string[];
	tipologiaUso?: string;
	areaTerreno?: number;
	areaComputavel?: number;
	valorM2?: number;
	fatorPlanejamento?: number;
	fatorSocial?: number;
	contrapartida?: number;
	valorCota?: number;
	valorMulta?: number;
};
