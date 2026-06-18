/** Dados completos retornados pelo GeoSampa / DEUSO (espelha SalvarMonitoramentoDto). */

export type IGeoSampaCoordenada = {
	coordenada_e?: number;
	coordenada_n?: number;
};

export type IGeoSampaLocalizacaoLote = {
	setor?: string;
	quadra?: string;
	lote_cadastrado?: string;
	lote_atualizado?: string;
	codigo_logradouro?: string;
};

export type IGeoSampaEndereco = {
	ordem: number;
	tipo?: string;
	titulo?: string;
	nome?: string;
	numero?: string;
};

export type IGeoSampaEnquadramentoUrbanistico = {
	distrito?: string;
	subprefeitura?: string;
	macrozona?: string;
	macroarea?: string;
	subsetor?: string;
	zona_uso_1_18081?: string;
	zona_uso_2_17975?: string;
	zona_uso_3_16402?: string;
	zona_uso_4_16050?: string;
	zona_uso_5_13885?: string;
	zona_uso_6_13885?: string;
	tipologia_uso_oodc?: string;
};

export type IGeoSampaSubcategoriasUso = {
	uso_r_hmp_his?: string;
	uso_r_hmp_his_2?: string;
	uso_r_hmp_his_3?: string;
	uso_nr?: string;
	uso_nr_2?: string;
	uso_nr_3?: string;
	uso_extra?: string;
};

export type IGeoSampaCalculoOutorga = {
	fp_uso_r?: string;
	fp_uso_nr?: string;
	fs_uso_r?: string;
	fs_uso_nr?: string;
	area_objeto_uso_r?: string;
	area_objeto_uso_nr?: string;
	area_total_objeto?: string;
	area_nao_computavel?: string;
	area_nao_computavel_incidente?: string;
	area_nao_computavel_final?: string;
	percentual_fachada_ativa?: string;
	area_computavel_total?: number;
	area_construida_total?: number;
	contrapartida_uso_r?: string;
	contrapartida_uso_nr?: string;
	contrapartida_total?: string;
	coeficiente_basico?: number;
	coeficiente_utilizado?: number;
	area_terreno?: number;
	valor_m2_quadro14?: number;
	area_fruicao_publica?: number;
	area_doacao_melhoramento?: number;
	area_doacao_calcada?: number;
	area_transferencia?: number;
	area_habitacao_social?: number;
};

export type IGeoSampaSituacao = {
	incidencia_cota_solidariedade?: 'SIM' | 'NAO';
	situacao?: string;
	origem?: string;
};

export type IGeoSampaLicenca = {
	tipo: 'APROVACAO' | 'EXECUCAO' | 'CERTIFICADO_CONCLUSAO';
	numero?: string;
	tipo_documento?: string;
	data_expedicao?: string;
};

export type IGeoSampaAnotacoesDeuso = {
	observacao_historico?: string;
	data_informacao_dmus?: string;
	solicitacao_dsiz?: string;
	preenchimento_qgis?: string;
};

/** Payload completo da consulta GeoSampa. */
export type IGeoSampaResult = {
	num_processo?: string;
	responsavel_preenchimento?: string;
	proposta_oodc_id?: string;
	numero_proposta?: string;
	processo_modificativo?: string;
	proprietario_interessado?: string;
	coordenada?: IGeoSampaCoordenada;
	localizacao_lote?: IGeoSampaLocalizacaoLote;
	enderecos?: IGeoSampaEndereco[];
	enquadramento_urbanistico?: IGeoSampaEnquadramentoUrbanistico;
	subcategorias_uso?: IGeoSampaSubcategoriasUso;
	calculo_outorga?: IGeoSampaCalculoOutorga;
	situacao?: IGeoSampaSituacao;
	licencas?: IGeoSampaLicenca[];
	anotacoes_deuso?: IGeoSampaAnotacoesDeuso;
};

/** Alias mantido para compatibilidade com o fluxo existente. */
export type IEnquadramentoResult = IGeoSampaResult;
