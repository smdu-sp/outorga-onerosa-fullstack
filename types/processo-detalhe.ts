/** @format */

import { IParcela } from './processo';

export type IMonitoramentoCoordenada = {
	coordenada_e?: string | number | null;
	coordenada_n?: string | number | null;
};

export type IMonitoramentoLocalizacaoLote = {
	setor?: string | null;
	quadra?: string | null;
	lote_cadastrado?: string | null;
	lote_atualizado?: string | null;
	codigo_logradouro?: string | null;
};

export type IMonitoramentoEndereco = {
	ordem: number;
	tipo?: string | null;
	titulo?: string | null;
	nome?: string | null;
	numero?: string | null;
};

export type IMonitoramentoEnquadramentoUrbanistico = {
	distrito?: string | null;
	subprefeitura?: string | null;
	macrozona?: string | null;
	macroarea?: string | null;
	subsetor?: string | null;
	zona_uso_1_18081?: string | null;
	zona_uso_2_17975?: string | null;
	zona_uso_3_16402?: string | null;
	zona_uso_4_16050?: string | null;
	zona_uso_5_13885?: string | null;
	zona_uso_6_13885?: string | null;
	tipologia_uso_oodc?: string | null;
};

export type IMonitoramentoSubcategoriaUso = {
	uso_r_hmp_his?: string | null;
	uso_r_hmp_his_2?: string | null;
	uso_r_hmp_his_3?: string | null;
	uso_nr?: string | null;
	uso_nr_2?: string | null;
	uso_nr_3?: string | null;
	uso_extra?: string | null;
};

export type IMonitoramentoCalculoOutorga = {
	fp_uso_r?: string | null;
	fp_uso_nr?: string | null;
	fs_uso_r?: string | null;
	fs_uso_nr?: string | null;
	area_objeto_uso_r?: string | null;
	area_objeto_uso_nr?: string | null;
	area_total_objeto?: string | null;
	area_nao_computavel?: string | null;
	area_nao_computavel_incidente?: string | null;
	area_nao_computavel_final?: string | null;
	percentual_fachada_ativa?: string | null;
	area_computavel_total?: string | number | null;
	area_construida_total?: string | number | null;
	contrapartida_uso_r?: string | null;
	contrapartida_uso_nr?: string | null;
	contrapartida_total?: string | null;
	coeficiente_basico?: string | number | null;
	coeficiente_utilizado?: string | number | null;
	area_terreno?: string | number | null;
	valor_m2_quadro14?: string | number | null;
	area_fruicao_publica?: string | number | null;
	area_doacao_melhoramento?: string | number | null;
	area_doacao_calcada?: string | number | null;
	area_transferencia?: string | number | null;
	area_habitacao_social?: string | number | null;
};

export type IMonitoramentoSituacao = {
	incidencia_cota_solidariedade?: string | null;
	situacao?: string | null;
	origem?: string | null;
};

export type IMonitoramentoLicenca = {
	tipo: string;
	numero?: string | null;
	tipo_documento?: string | null;
	data_expedicao?: string | null;
};

export type IMonitoramentoAnotacaoDeuso = {
	observacao_historico?: string | null;
	data_informacao_dmus?: string | null;
	solicitacao_dsiz?: string | null;
	preenchimento_qgis?: string | null;
};

export type IMonitoramentoFicha = {
	responsavel_preenchimento?: string | null;
	proposta_oodc_id?: string | null;
	numero_proposta?: string | null;
	processo_modificativo?: string | null;
	proprietario_interessado?: string | null;
	coordenada?: IMonitoramentoCoordenada | null;
	localizacao_lote?: IMonitoramentoLocalizacaoLote | null;
	enderecos?: IMonitoramentoEndereco[];
	enquadramento_urbanistico?: IMonitoramentoEnquadramentoUrbanistico | null;
	subcategorias_uso?: IMonitoramentoSubcategoriaUso | null;
	calculo_outorga?: IMonitoramentoCalculoOutorga | null;
	situacao?: IMonitoramentoSituacao | null;
	licencas?: IMonitoramentoLicenca[];
	anotacoes_deuso?: IMonitoramentoAnotacaoDeuso | null;
};

export type IMonitoramentoCotaSolidariedade = {
	ficha_ouc?: number | null;
	proposta_oodc?: number | null;
	data_informacao_dmus?: string | null;
	setor?: string | null;
	quadra?: string | null;
	lote?: string | null;
	lote_atualizado_sqcond?: string | null;
	codigo_logradouro?: string | null;
	endereco?: string | null;
	proprietario_interessado?: string | null;
	distrito?: string | null;
	subprefeitura?: string | null;
	macrozona?: string | null;
	macroarea?: string | null;
	subsetor?: string | null;
	zona_uso?: string | null;
	subcategoria_uso?: string | null;
	coeficiente_utilizado?: string | number | null;
	area_terreno?: string | number | null;
	valor_m2_quadro14?: string | number | null;
	alvara_aprovacao?: string | null;
	alvara_execucao?: string | null;
	certificado_conclusao?: string | null;
	observacao?: string | null;
	origem?: string | null;
	area_habitacao_social?: string | null;
	situacao_cota?: string | null;
	modalidade?: string | null;
	unidades?: string | null;
	estimativa_deposito_fundurb?: string | number | null;
	valor_calculado_processo?: string | number | null;
	valor_pago?: string | null;
	valor_devido?: string | null;
	comprovantes_pagamento_prodam?: string | null;
	planilha_calculo_cota?: string | null;
	termo_compromisso_portaria?: string | null;
	solicitacao_dsiz?: string | null;
	preenchimento_qgis?: string | null;
	observacoes?: string | null;
	ficha_revisada_em?: string | null;
	area_construida_computavel_total?: string | number | null;
};

export type IProcessoDetalhe = {
	id: string;
	tipo?: string | null;
	codigo?: string | null;
	num_processo: string;
	protocolo_ad?: string | null;
	data_entrada?: string | null;
	status_pagamento?: string;
	criado_em?: string;
	alterado_em?: string;
	parcelas?: IParcela[];
	monitoramento?: IMonitoramentoFicha | null;
	monitoramento_cota?: IMonitoramentoCotaSolidariedade | null;
};

export type IRespostaProcessoDetalhe = {
	ok: boolean;
	error: string | null;
	data: IProcessoDetalhe | null;
	status: number;
};
