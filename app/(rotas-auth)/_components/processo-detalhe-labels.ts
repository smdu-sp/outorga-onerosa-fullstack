/** @format */

export const LABELS_PROCESSO: Record<string, string> = {
	tipo: 'Tipo',
	codigo: 'Código',
	num_processo: 'Número do Processo',
	protocolo_ad: 'Protocolo AD',
	data_entrada: 'Data de Entrada',
	status_pagamento: 'Status de Pagamento',
	criado_em: 'Criado em',
	alterado_em: 'Alterado em',
};

export const LABELS_PARCELA: Record<string, string> = {
	num_parcela: 'Nº Parcela',
	valor: 'Valor',
	vencimento: 'Vencimento',
	data_quitacao: 'Data Quitação',
	ano_pagamento: 'Ano Pagamento',
	cpf_cnpj: 'CPF/CNPJ',
	status_quitacao: 'Quitada',
	criado_em: 'Criado em',
	alterado_em: 'Alterado em',
};

export const LABELS_MONITORAMENTO_FICHA: Record<string, string> = {
	responsavel_preenchimento: 'Responsável pelo Preenchimento',
	proposta_oodc_id: 'ID Proposta OODC',
	numero_proposta: 'Número da Proposta',
	processo_modificativo: 'Processo Modificativo',
	proprietario_interessado: 'Proprietário / Interessado',
	criado_em: 'Criado em',
	alterado_em: 'Alterado em',
};

export const LABELS_COORDENADA: Record<string, string> = {
	coordenada_e: 'Coordenada E (X)',
	coordenada_n: 'Coordenada N (Y)',
};

export const LABELS_LOCALIZACAO_LOTE: Record<string, string> = {
	setor: 'Setor',
	quadra: 'Quadra',
	lote_cadastrado: 'Lote Cadastrado',
	lote_atualizado: 'Lote Atualizado',
	codigo_logradouro: 'Código Logradouro',
};

export const LABELS_ENDERECO: Record<string, string> = {
	ordem: 'Ordem',
	tipo: 'Tipo',
	titulo: 'Título',
	nome: 'Nome',
	numero: 'Número',
};

export const LABELS_ENQUADRAMENTO: Record<string, string> = {
	distrito: 'Distrito',
	subprefeitura: 'Subprefeitura',
	macrozona: 'Macrozona',
	macroarea: 'Macroárea',
	subsetor: 'Subsetor',
	zona_uso_1_18081: 'Zona de Uso 1',
	zona_uso_2_17975: 'Zona de Uso 2',
	zona_uso_3_16402: 'Zona de Uso 3',
	zona_uso_4_16050: 'Zona de Uso 4',
	zona_uso_5_13885: 'Zona de Uso 5',
	zona_uso_6_13885: 'Zona de Uso 6',
	tipologia_uso_oodc: 'Tipologia de Uso OODC',
	uso: 'Uso',
};

export const LABELS_SUBCATEGORIA_USO: Record<string, string> = {
	uso_r_hmp_his: 'Uso R/HMP/HIS',
	uso_r_hmp_his_2: 'Uso R/HMP/HIS (2)',
	uso_r_hmp_his_3: 'Uso R/HMP/HIS (3)',
	uso_nr: 'Uso nR',
	uso_nr_2: 'Uso nR (2)',
	uso_nr_3: 'Uso nR (3)',
	uso_extra: 'Uso Extra',
};

export const LABELS_CALCULO_OUTORGA: Record<string, string> = {
	fp_uso_r: 'Fp Uso R',
	fp_uso_nr: 'Fp Uso nR',
	fs_uso_r: 'Fs Uso R',
	fs_uso_nr: 'Fs Uso nR',
	area_objeto_uso_r: 'Área Objeto Uso R',
	area_objeto_uso_nr: 'Área Objeto Uso nR',
	area_total_objeto: 'Área Total Objeto',
	area_nao_computavel: 'Área Não Computável',
	area_nao_computavel_incidente: 'Área Não Computável Incidente',
	area_nao_computavel_final: 'Área Não Computável Final',
	percentual_fachada_ativa: 'Percentual Fachada Ativa',
	area_computavel_total: 'Área Computável Total',
	area_construida_total: 'Área Construída Total',
	contrapartida_uso_r: 'Contrapartida Uso R',
	contrapartida_uso_nr: 'Contrapartida Uso nR',
	contrapartida_total: 'Contrapartida Total',
	coeficiente_basico: 'Coeficiente Básico',
	coeficiente_utilizado: 'Coeficiente Utilizado',
	area_terreno: 'Área Terreno',
	valor_m2_quadro14: 'Valor m² (Quadro 14)',
	area_fruicao_publica: 'Área Fruição Pública',
	area_doacao_melhoramento: 'Área Doação Melhoramento',
	area_doacao_calcada: 'Área Doação Calçada',
	area_transferencia: 'Área Transferência',
	area_habitacao_social: 'Área Habitação Social',
};

export const LABELS_SITUACAO: Record<string, string> = {
	incidencia_cota_solidariedade: 'Incidência Cota Solidariedade',
	situacao: 'Situação',
	origem: 'Origem',
};

export const LABELS_LICENCA: Record<string, string> = {
	tipo: 'Tipo',
	numero: 'Número',
	tipo_documento: 'Tipo Documento',
	data_expedicao: 'Data Expedição',
};

export const LABELS_ANOTACOES: Record<string, string> = {
	observacao_historico: 'Observação / Histórico',
	data_informacao_dmus: 'Data Informação DMUS',
	solicitacao_dsiz: 'Solicitação DSIZ',
	preenchimento_qgis: 'Preenchimento QGIS',
};

export const LABELS_COTA: Record<string, string> = {
	ficha_ouc: 'Ficha OUC',
	proposta_oodc: 'Proposta OODC',
	lote: 'Lote',
	lote_atualizado_sqcond: 'Lote Atualizado (SQCOND)',
	endereco: 'Endereço',
	zona_uso: 'Zona de Uso',
	subcategoria_uso: 'Subcategoria de Uso',
	alvara_aprovacao: 'Alvará Aprovação',
	alvara_execucao: 'Alvará Execução',
	certificado_conclusao: 'Certificado Conclusão',
	observacao: 'Observação',
	situacao_cota: 'Situação Cota',
	modalidade: 'Modalidade',
	unidades: 'Unidades',
	estimativa_deposito_fundurb: 'Estimativa Depósito FUNDURB',
	valor_calculado_processo: 'Valor Calculado Processo',
	valor_pago: 'Valor Pago',
	valor_devido: 'Valor Devido',
	comprovantes_pagamento_prodam: 'Comprovantes Pagamento PRODAM',
	planilha_calculo_cota: 'Planilha Cálculo Cota',
	termo_compromisso_portaria: 'Termo Compromisso / Portaria',
	observacoes: 'Observações',
	ficha_revisada_em: 'Ficha Revisada em',
	area_construida_computavel_total: 'Área Construída Computável Total',
};

export const INCIDENCIA_COTA: Record<string, string> = {
	SIM: 'Sim',
	NAO: 'Não',
};

export const SITUACAO_MONITORAMENTO: Record<string, string> = {
	QUITADO: 'Quitado',
	ARRECADADO_AD: 'Arrecadado AD',
	EM_PAGAMENTO: 'Em Pagamento',
	SEM_INFORMACAO: 'Sem Informação',
};

export const ORIGEM_MONITORAMENTO: Record<string, string> = {
	SISACOE: 'SISACOE',
	SEI: 'SEI',
	APROVA_DIGITAL: 'Aprova Digital',
	OUTRO: 'Outro',
};

export const CONSTA_DOCUMENTO: Record<string, string> = {
	CONSTA: 'Consta',
	NAO_CONSTA: 'Não consta',
	NAO_SE_APLICA: 'Não se aplica',
};

export const TIPO_PROCESSO: Record<string, string> = {
	PDE: 'PDE',
	COTA: 'COTA',
};

export const TIPOLOGIA_USO_OODC: Record<string, string> = {
	R: 'R - Residencial',
	nR: 'nR - Não Residencial',
	'R/nR': 'R/nR - Uso Misto',
};

export const TIPO_LICENCA: Record<string, string> = {
	APROVACAO: 'Alvará de Aprovação',
	EXECUCAO: 'Alvará de Execução',
	CERTIFICADO_CONCLUSAO: 'Certificado de Conclusão',
};

export const STATUS_PAGAMENTO: Record<string, string> = {
	EM_PAGAMENTO: 'Em Pagamento',
	QUITADO: 'Quitado',
	QUEBRA: 'Quebra',
};
