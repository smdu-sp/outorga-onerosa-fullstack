/**
 * Tipos de entrada/saída do motor de cálculo da OODC (lib/oodc/calculo.ts),
 * espelhando as seções da aba `oodc` da planilha oficial (memorial de cálculo).
 */

/** Uma das até 10 linhas de "VALORES UNITÁRIOS" (setor/quadra/codlog) usadas para achar o V (R$/m²). */
export interface EnderecoValorUnitario {
	setor: string;
	quadra: string;
	codlog: string;
}

/** Resultado da busca do V (R$/m²) para um endereço informado. */
export interface ValorUnitarioEncontrado extends EnderecoValorUnitario {
	valor: number | null;
	dataVigencia: string | null; // ISO yyyy-mm-dd
}

/** Bloco "PARÂMETROS QUALIFICADORES DA OCUPAÇÃO" — benefícios de área e suas bases legais. */
export interface ParametrosQualificadores {
	areaResFruicaoM2: number; // area_res_frui
	baseLegalFruiId: number; // id_base_legal_frui (tbl_base_frui)
	areaDoacaoVerdeM2: number; // area_doa_ver (sempre usa CA adicional, sem base legal selecionável)
	areaDoacaoMelhoramentoM2: number; // area_doa_mel
	baseLegalMelId: number; // id_base_legal_mel (tbl_base_mel) — 0 = nenhuma
	areaReservaPracaM2: number; // area_res_pra (base legal fixa: art. 82-A da Lei 17.975/2023)
	areaDoacaoCalcadaM2: number; // area_doa_cal
	baseLegalCalId: number; // id_base_legal_cal (tbl_base_cal) — 0 = nenhuma
}

/** Bloco "PARÂMETROS DA OCUPAÇÃO DO SOLO". */
export interface ParametrosOcupacaoSolo {
	cotaParteMaximaM2: number; // cp_max — cota parte máxima de terreno por UH efetiva
}

/** Bloco "VALORES A DEDUZIR" — 5 deduções manuais em R$ (a 6ª, EHIS/EZEIS, é calculada). */
export interface DeducoesContrapartida {
	outorgaProjetoAnteriorRs: number;
	incentivoCertificacaoRs: number;
	incentivoCotaAmbientalRs: number;
	outorgaProjetoModificativoRs: number;
	outorgaApoioUrbanoSulRs: number;
}

/** Uma das até 7 tipologias simultâneas do empreendimento. */
export interface TipologiaCalculo {
	/** Chave local só para a UI (adicionar/remover linhas); não existe na planilha. */
	chave: string;
	idTipologia: number; // id_tpl_N (tbl_tpl)
	caBasico: number; // ca_bas_N
	caMaximo: number; // ca_max_N
	terrenoM2: number; // terreno_N
	computavelM2: number; // computavel_N
	tdcM2: number; // tdc_N
	/** Rótulo na planilha: "OUTORGA ADQUIRIDA (M2)"; nome interno na planilha: computavel_isento_N. */
	outorgaAdquiridaM2: number;
}

/** Entrada completa do memorial de cálculo (um "cenário" de teste). */
export interface EntradaCalculoOodc {
	idAssunto: number; // id_assunto (tbl_assuntos)
	idLegislacao: number; // id_legi (tbl_lei)
	idMacrozona: number; // id_macrozona
	idMacroarea: number; // id_macroarea
	idZona: number; // id_zona
	/** Só relevante se idLegislacao ∈ IDS_LEGISLACAO_PIU_CENTRAL. */
	idAreaAiu?: number; // id_area_aiu (tbl_aiu)
	enderecos: EnderecoValorUnitario[]; // até 10 linhas
	qualificadores: ParametrosQualificadores;
	ocupacaoSolo: ParametrosOcupacaoSolo;
	deducoes: DeducoesContrapartida;
	idClassificacaoEmpreendimento: number; // id_class_empr (0 = nenhuma)
	tipologias: TipologiaCalculo[]; // até 7
	/** Data de referência do cálculo (default: hoje) — usada na busca do V vigente e no corte de vigência. */
	dataReferencia?: string; // ISO yyyy-mm-dd
}

/** Resultado calculado para uma tipologia. */
export interface ResultadoTipologia {
	chave: string;
	idTipologia: number;
	idTipologiaUso: number; // 1 = R, 2 = nR (deriva de idTipologia)
	fp: number;
	fs: number;
	caAdicional: number; // ca_max - ca_bas
	beneficioM2: number;
	objetoOutorgaM2: number;
	c: number; // R$/m² efetivo
	valorRs: number;
}

/** Totais e resultado final do memorial de cálculo. */
export interface ResultadoCalculoOodc {
	vMax: number | null;
	valoresUnitariosEncontrados: ValorUnitarioEncontrado[];
	tipologias: ResultadoTipologia[];
	somaTerrenoM2: number;
	somaComputavelM2: number;
	somaTdcM2: number;
	somaOutorgaAdquiridaM2: number;
	somaBeneficioM2: number;
	somaOutorgaM2: number;
	valorTotalBrutoRs: number;
	deducaoEhisEzeisRs: number;
	valorTotalRecolhidoRs: number;
	valorTotalLiquidoRs: number;
	/** false quando dataReferencia > LIMITE_VIGENCIA_TABELA_V — planilha 1.1.0 não define valor além dessa data. */
	dentroDaVigencia: boolean;
}
