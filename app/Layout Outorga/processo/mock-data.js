/** Dados de exemplo + configuração de campos — portados do schema real do Outorga. */
(function () {
  // ---- Enums (de processo-detalhe-labels.ts) ----
  const TIPO_PROCESSO = { PDE: 'PDE', COTA: 'COTA' };
  const STATUS_PAGAMENTO = { EM_PAGAMENTO: 'Em Pagamento', QUITADO: 'Quitado', QUEBRA: 'Quebra' };
  const SITUACAO_MONITORAMENTO = { QUITADO: 'Quitado', ARRECADADO_AD: 'Arrecadado AD', EM_PAGAMENTO: 'Em Pagamento', SEM_INFORMACAO: 'Sem Informação' };
  const ORIGEM_MONITORAMENTO = { SISACOE: 'SISACOE', SEI: 'SEI', APROVA_DIGITAL: 'Aprova Digital', OUTRO: 'Outro' };
  const INCIDENCIA_COTA = { SIM: 'Sim', NAO: 'Não' };
  const CONSTA_DOCUMENTO = { CONSTA: 'Consta', NAO_CONSTA: 'Não consta', NAO_SE_APLICA: 'Não se aplica' };
  const TIPO_LICENCA = { APROVACAO: 'Alvará de Aprovação', EXECUCAO: 'Alvará de Execução', CERTIFICADO_CONCLUSAO: 'Certificado de Conclusão' };

  const sel = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));

  // ---- Helper p/ montar campos: f(key, label, type, extra) ----
  const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });

  // ===== Seções (uma por tabela do banco) =====
  // tipo: 'grid' | 'parcelas' | 'enderecos' | 'licencas'
  // grupo: rótulo do agrupamento na navegação vertical
  const SECOES = [
    {
      id: 'processo', grupo: 'Processo', titulo: 'Dados do Processo', tabela: 'processos', tipo: 'grid',
      campos: [
        f('num_processo', 'Número do Processo', 'text', { required: true }),
        f('tipo', 'Tipo', 'select', { options: sel(TIPO_PROCESSO), required: true }),
        f('codigo', 'Código', 'text'),
        f('protocolo_ad', 'Protocolo AD', 'text'),
        f('data_entrada', 'Data de Entrada', 'date', { required: true }),
        f('status_pagamento', 'Status de Pagamento', 'select', { options: sel(STATUS_PAGAMENTO), readonly: true, nota: 'Definido pelas parcelas' }),
        f('criado_em', 'Criado em', 'datetime', { readonly: true }),
        f('alterado_em', 'Alterado em', 'datetime', { readonly: true }),
      ],
    },
    {
      id: 'calculo', grupo: 'Processo', titulo: 'Cálculo da Outorga', tabela: 'monitoramento_calculo_outorga', tipo: 'grid', via: 'monitoramento.calculo_outorga',
      calculado: true,
      campos: [
        f('coeficiente_basico', 'Coeficiente Básico', 'number', { readonly: true }),
        f('coeficiente_utilizado', 'Coeficiente Utilizado', 'number', { readonly: true }),
        f('area_terreno', 'Área Terreno', 'area', { readonly: true }),
        f('valor_m2_quadro14', 'Valor m² (Quadro 14)', 'currency', { readonly: true }),
        f('fp_uso_r', 'Fp Uso R', 'number', { readonly: true }),
        f('fp_uso_nr', 'Fp Uso nR', 'number', { readonly: true }),
        f('fs_uso_r', 'Fs Uso R', 'number', { readonly: true }),
        f('fs_uso_nr', 'Fs Uso nR', 'number', { readonly: true }),
        f('area_objeto_uso_r', 'Área Objeto Uso R', 'area', { readonly: true }),
        f('area_objeto_uso_nr', 'Área Objeto Uso nR', 'area', { readonly: true }),
        f('area_total_objeto', 'Área Total Objeto', 'area', { readonly: true }),
        f('area_computavel_total', 'Área Computável Total', 'area', { readonly: true }),
        f('area_construida_total', 'Área Construída Total', 'area', { readonly: true }),
        f('area_nao_computavel', 'Área Não Computável', 'area', { readonly: true }),
        f('percentual_fachada_ativa', 'Percentual Fachada Ativa', 'text', { readonly: true }),
        f('contrapartida_uso_r', 'Contrapartida Uso R', 'currency', { readonly: true }),
        f('contrapartida_uso_nr', 'Contrapartida Uso nR', 'currency', { readonly: true }),
        f('contrapartida_total', 'Contrapartida Total', 'currency', { readonly: true, destaque: true }),
      ],
    },
    {
      id: 'parcelas', grupo: 'Processo', titulo: 'Parcelas', tabela: 'parcelas', tipo: 'parcelas',
    },
    {
      id: 'ficha', grupo: 'Monitoramento DEUSO', titulo: 'Ficha de Monitoramento', tabela: 'monitoramento_fichas', tipo: 'grid', via: 'monitoramento',
      campos: [
        f('proprietario_interessado', 'Proprietário / Interessado', 'text', { full: true }),
        f('responsavel_preenchimento', 'Responsável pelo Preenchimento', 'text'),
        f('numero_proposta', 'Número da Proposta', 'text'),
        f('proposta_oodc_id', 'ID Proposta OODC', 'text'),
        f('processo_modificativo', 'Processo Modificativo', 'text'),
        f('criado_em', 'Criado em', 'datetime', { readonly: true }),
        f('alterado_em', 'Alterado em', 'datetime', { readonly: true }),
      ],
    },
    {
      id: 'coordenada', grupo: 'Monitoramento DEUSO', titulo: 'Coordenada', tabela: 'monitoramento_coordenadas', tipo: 'grid', via: 'monitoramento.coordenada',
      campos: [
        f('coordenada_e', 'Coordenada E (X)', 'text'),
        f('coordenada_n', 'Coordenada N (Y)', 'text'),
      ],
    },
    {
      id: 'localizacao', grupo: 'Monitoramento DEUSO', titulo: 'Localização do Lote', tabela: 'monitoramento_localizacao_lote', tipo: 'grid', via: 'monitoramento.localizacao_lote',
      campos: [
        f('setor', 'Setor', 'text'),
        f('quadra', 'Quadra', 'text'),
        f('lote_cadastrado', 'Lote Cadastrado', 'text'),
        f('lote_atualizado', 'Lote Atualizado', 'text'),
        f('codigo_logradouro', 'Código Logradouro', 'text'),
      ],
    },
    {
      id: 'enderecos', grupo: 'Monitoramento DEUSO', titulo: 'Endereços', tabela: 'monitoramento_enderecos', tipo: 'enderecos', via: 'monitoramento.enderecos',
    },
    {
      id: 'enquadramento', grupo: 'Monitoramento DEUSO', titulo: 'Enquadramento Urbanístico', tabela: 'monitoramento_enquadramento_urbanistico', tipo: 'grid', via: 'monitoramento.enquadramento_urbanistico',
      campos: [
        f('distrito', 'Distrito', 'text'),
        f('subprefeitura', 'Subprefeitura', 'text'),
        f('macrozona', 'Macrozona', 'text'),
        f('macroarea', 'Macroárea', 'text'),
        f('subsetor', 'Subsetor', 'text'),
        f('zona_uso_1_18081', 'Zona de Uso 1', 'text'),
        f('zona_uso_2_17975', 'Zona de Uso 2', 'text'),
        f('zona_uso_3_16402', 'Zona de Uso 3', 'text'),
        f('zona_uso_4_16050', 'Zona de Uso 4', 'text'),
        f('zona_uso_5_13885', 'Zona de Uso 5', 'text'),
        f('zona_uso_6_13885', 'Zona de Uso 6', 'text'),
        f('tipologia_uso_oodc', 'Tipologia de Uso OODC', 'text', { full: true }),
      ],
    },
    {
      id: 'subcategorias', grupo: 'Monitoramento DEUSO', titulo: 'Subcategorias de Uso', tabela: 'monitoramento_subcategorias_uso', tipo: 'grid', via: 'monitoramento.subcategorias_uso',
      campos: [
        f('uso_r_hmp_his', 'Uso R/HMP/HIS', 'text'),
        f('uso_r_hmp_his_2', 'Uso R/HMP/HIS (2)', 'text'),
        f('uso_r_hmp_his_3', 'Uso R/HMP/HIS (3)', 'text'),
        f('uso_nr', 'Uso nR', 'text'),
        f('uso_nr_2', 'Uso nR (2)', 'text'),
        f('uso_nr_3', 'Uso nR (3)', 'text'),
        f('uso_extra', 'Uso Extra', 'text'),
      ],
    },
    {
      id: 'situacao', grupo: 'Monitoramento DEUSO', titulo: 'Situação', tabela: 'monitoramento_situacao', tipo: 'grid', via: 'monitoramento.situacao',
      campos: [
        f('situacao', 'Situação', 'select', { options: sel(SITUACAO_MONITORAMENTO) }),
        f('incidencia_cota_solidariedade', 'Incidência Cota Solidariedade', 'select', { options: sel(INCIDENCIA_COTA) }),
        f('origem', 'Origem', 'select', { options: sel(ORIGEM_MONITORAMENTO) }),
      ],
    },
    {
      id: 'licencas', grupo: 'Monitoramento DEUSO', titulo: 'Licenças', tabela: 'monitoramento_licencas', tipo: 'licencas', via: 'monitoramento.licencas',
    },
    {
      id: 'anotacoes', grupo: 'Monitoramento DEUSO', titulo: 'Anotações DEUSO', tabela: 'monitoramento_anotacoes_deuso', tipo: 'grid', via: 'monitoramento.anotacoes_deuso',
      campos: [
        f('observacao_historico', 'Observação / Histórico', 'textarea', { full: true }),
        f('data_informacao_dmus', 'Data Informação DMUS', 'date'),
        f('solicitacao_dsiz', 'Solicitação DSIZ', 'text'),
        f('preenchimento_qgis', 'Preenchimento QGIS', 'text'),
      ],
    },
    {
      id: 'cota', grupo: 'Cota de Solidariedade', titulo: 'Cota de Solidariedade', tabela: 'monitoramento_cota_solidariedade', tipo: 'grid', via: 'monitoramento_cota',
      campos: [
        f('proprietario_interessado', 'Proprietário / Interessado', 'text', { full: true }),
        f('endereco', 'Endereço', 'textarea', { full: true }),
        f('ficha_ouc', 'Ficha OUC', 'number'),
        f('proposta_oodc', 'Proposta OODC', 'number'),
        f('data_informacao_dmus', 'Data Informação DMUS', 'date'),
        f('setor', 'Setor', 'text'),
        f('quadra', 'Quadra', 'text'),
        f('lote', 'Lote', 'text'),
        f('lote_atualizado_sqcond', 'Lote Atualizado (SQCOND)', 'text'),
        f('codigo_logradouro', 'Código Logradouro', 'text'),
        f('distrito', 'Distrito', 'text'),
        f('subprefeitura', 'Subprefeitura', 'text'),
        f('macrozona', 'Macrozona', 'text'),
        f('macroarea', 'Macroárea', 'text'),
        f('subsetor', 'Subsetor', 'text'),
        f('zona_uso', 'Zona de Uso', 'text'),
        f('subcategoria_uso', 'Subcategoria de Uso', 'text'),
        f('modalidade', 'Modalidade', 'text'),
        f('unidades', 'Unidades', 'text'),
        f('coeficiente_utilizado', 'Coeficiente Utilizado', 'number'),
        f('area_terreno', 'Área Terreno', 'area'),
        f('area_construida_computavel_total', 'Área Construída Computável Total', 'area'),
        f('area_habitacao_social', 'Área Habitação Social', 'text'),
        f('valor_m2_quadro14', 'Valor m² (Quadro 14)', 'currency'),
        f('estimativa_deposito_fundurb', 'Estimativa Depósito FUNDURB', 'currency'),
        f('valor_calculado_processo', 'Valor Calculado Processo', 'currency'),
        f('valor_pago', 'Valor Pago', 'currency'),
        f('valor_devido', 'Valor Devido', 'currency'),
        f('situacao_cota', 'Situação Cota', 'text'),
        f('alvara_aprovacao', 'Alvará Aprovação', 'text'),
        f('alvara_execucao', 'Alvará Execução', 'text'),
        f('certificado_conclusao', 'Certificado Conclusão', 'text'),
        f('comprovantes_pagamento_prodam', 'Comprovantes Pagamento PRODAM', 'text'),
        f('planilha_calculo_cota', 'Planilha Cálculo Cota', 'select', { options: sel(CONSTA_DOCUMENTO) }),
        f('termo_compromisso_portaria', 'Termo Compromisso / Portaria', 'select', { options: sel(CONSTA_DOCUMENTO) }),
        f('origem', 'Origem', 'text'),
        f('solicitacao_dsiz', 'Solicitação DSIZ', 'text'),
        f('preenchimento_qgis', 'Preenchimento QGIS', 'text'),
        f('observacao', 'Observação', 'textarea', { full: true }),
        f('observacoes', 'Observações', 'textarea', { full: true }),
        f('ficha_revisada_em', 'Ficha Revisada em', 'date'),
      ],
    },
  ];

  const COLUNAS_PARCELA = [
    { key: 'num_parcela', label: 'Nº', type: 'text' },
    { key: 'valor', label: 'Valor', type: 'currency' },
    { key: 'vencimento', label: 'Vencimento', type: 'date' },
    { key: 'data_quitacao', label: 'Data Quitação', type: 'date' },
    { key: 'ano_pagamento', label: 'Ano', type: 'text' },
    { key: 'cpf_cnpj', label: 'CPF/CNPJ', type: 'text' },
    { key: 'status_quitacao', label: 'Situação', type: 'status' },
  ];
  const COLUNAS_ENDERECO = [
    { key: 'ordem', label: 'Ordem', type: 'text' },
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'titulo', label: 'Título', type: 'text' },
    { key: 'nome', label: 'Nome', type: 'text' },
    { key: 'numero', label: 'Número', type: 'text' },
  ];
  const COLUNAS_LICENCA = [
    { key: 'tipo', label: 'Tipo', type: 'select', options: sel(TIPO_LICENCA) },
    { key: 'numero', label: 'Número', type: 'text' },
    { key: 'tipo_documento', label: 'Tipo Documento', type: 'text' },
    { key: 'data_expedicao', label: 'Data Expedição', type: 'date' },
  ];

  // ===== Processo de exemplo (com alguns campos vazios de propósito) =====
  const PROCESSO = {
    id: 'p-2024-0042',
    num_processo: '2023.0.123.4567-8',
    tipo: 'PDE',
    codigo: 'OODC-4421',
    protocolo_ad: 'AD-2023-88120',
    data_entrada: '2023-04-18',
    status_pagamento: 'EM_PAGAMENTO',
    criado_em: '2023-04-18T09:32:00',
    alterado_em: '2026-05-29T14:05:00',
    parcelas: [
      { id: 'pa1', num_parcela: 1, valor: 184250.0, vencimento: '2023-06-10', data_quitacao: '2023-06-08', ano_pagamento: 2023, cpf_cnpj: '12.345.678/0001-90', status_quitacao: true },
      { id: 'pa2', num_parcela: 2, valor: 184250.0, vencimento: '2024-06-10', data_quitacao: '2024-06-09', ano_pagamento: 2024, cpf_cnpj: '12.345.678/0001-90', status_quitacao: true },
      { id: 'pa3', num_parcela: 3, valor: 184250.0, vencimento: '2025-06-10', data_quitacao: null, ano_pagamento: 2025, cpf_cnpj: '12.345.678/0001-90', status_quitacao: false },
      { id: 'pa4', num_parcela: 4, valor: 184250.0, vencimento: '2026-06-10', data_quitacao: null, ano_pagamento: null, cpf_cnpj: '12.345.678/0001-90', status_quitacao: false },
    ],
    monitoramento: {
      proprietario_interessado: 'Incorporadora Vila Nova Empreendimentos Ltda.',
      responsavel_preenchimento: 'Ana Beatriz Cardoso',
      numero_proposta: '2023/0421',
      proposta_oodc_id: 'OODC-4421',
      processo_modificativo: '',
      criado_em: '2023-05-02T10:11:00',
      alterado_em: '2026-05-29T14:05:00',
      coordenada: { coordenada_e: '333.412,18', coordenada_n: '7.394.880,42' },
      localizacao_lote: { setor: '073', quadra: '142', lote_cadastrado: '0021', lote_atualizado: '0021-3', codigo_logradouro: '' },
      enderecos: [
        { ordem: 1, tipo: 'Avenida', titulo: 'Eng.', nome: 'Luís Carlos Berrini', numero: '1500' },
        { ordem: 2, tipo: 'Rua', titulo: '', nome: 'Funchal', numero: '263' },
      ],
      enquadramento_urbanistico: {
        distrito: 'Itaim Bibi', subprefeitura: 'Pinheiros', macrozona: 'Estruturação e Qualificação Urbana',
        macroarea: 'Estruturação Metropolitana', subsetor: 'Arco Pinheiros',
        zona_uso_1_18081: 'ZEU', zona_uso_2_17975: '', zona_uso_3_16402: '', zona_uso_4_16050: '',
        zona_uso_5_13885: '', zona_uso_6_13885: '', tipologia_uso_oodc: 'Misto (R + nR)',
      },
      subcategorias_uso: { uso_r_hmp_his: 'R', uso_r_hmp_his_2: '', uso_r_hmp_his_3: '', uso_nr: 'nR1', uso_nr_2: '', uso_nr_3: '', uso_extra: '' },
      calculo_outorga: {
        coeficiente_basico: 1, coeficiente_utilizado: 4, area_terreno: 2400, valor_m2_quadro14: 9200,
        fp_uso_r: 1, fp_uso_nr: 1, fs_uso_r: 0.7, fs_uso_nr: 1,
        area_objeto_uso_r: 5200, area_objeto_uso_nr: 3100, area_total_objeto: 8300,
        area_computavel_total: 9600, area_construida_total: 11200, area_nao_computavel: 1600,
        percentual_fachada_ativa: '25%', contrapartida_uso_r: 268640, contrapartida_uso_nr: 468360, contrapartida_total: 737000,
      },
      situacao: { situacao: 'EM_PAGAMENTO', incidencia_cota_solidariedade: 'SIM', origem: 'SEI' },
      licencas: [
        { id: 'l1', tipo: 'APROVACAO', numero: '2023/12.345-00', tipo_documento: 'Alvará', data_expedicao: '2023-08-15' },
        { id: 'l2', tipo: 'EXECUCAO', numero: '2024/00.987-11', tipo_documento: 'Alvará', data_expedicao: '2024-02-20' },
      ],
      anotacoes_deuso: {
        observacao_historico: 'Processo com incidência de cota de solidariedade. Aguardando comprovação da 3ª parcela.',
        data_informacao_dmus: '2024-11-12', solicitacao_dsiz: '', preenchimento_qgis: 'Sim',
      },
    },
    monitoramento_cota: {
      proprietario_interessado: 'Incorporadora Vila Nova Empreendimentos Ltda.',
      endereco: 'Av. Eng. Luís Carlos Berrini, 1500 — Itaim Bibi, São Paulo/SP',
      ficha_ouc: 4421, proposta_oodc: 421, data_informacao_dmus: '2024-11-12',
      setor: '073', quadra: '142', lote: '0021', lote_atualizado_sqcond: '0021-3', codigo_logradouro: '',
      distrito: 'Itaim Bibi', subprefeitura: 'Pinheiros', macrozona: 'Estruturação e Qualificação Urbana',
      macroarea: 'Estruturação Metropolitana', subsetor: 'Arco Pinheiros', zona_uso: 'ZEU', subcategoria_uso: 'Misto',
      modalidade: 'Habitação de Interesse Social', unidades: '40', coeficiente_utilizado: 4, area_terreno: 2400,
      area_construida_computavel_total: 9600, area_habitacao_social: '1200', valor_m2_quadro14: 9200,
      estimativa_deposito_fundurb: 737000, valor_calculado_processo: 737000, valor_pago: 368500, valor_devido: 368500,
      situacao_cota: 'Em pagamento', alvara_aprovacao: '2023/12.345-00', alvara_execucao: '2024/00.987-11', certificado_conclusao: '',
      comprovantes_pagamento_prodam: '', planilha_calculo_cota: 'CONSTA', termo_compromisso_portaria: 'NAO_CONSTA',
      origem: 'SEI', solicitacao_dsiz: '', preenchimento_qgis: 'Sim', observacao: '', observacoes: '', ficha_revisada_em: '',
    },
  };

  // Histórico de alterações de exemplo (por campo "secao.campo")
  const HISTORICO = {
    'processo.status_pagamento': [{ usuario: 'Ana Cardoso', em: '2026-05-29T14:05:00', de: 'Quitado', para: 'Em Pagamento' }],
    'situacao.situacao': [{ usuario: 'Ana Cardoso', em: '2026-05-29T14:05:00', de: 'Quitado', para: 'Em Pagamento' }],
    'ficha.proprietario_interessado': [{ usuario: 'Marcos Lima', em: '2025-10-02T11:20:00', de: 'Vila Nova Ltda', para: 'Incorporadora Vila Nova Empreendimentos Ltda.' }],
  };

  window.MOCK = {
    SECOES, COLUNAS_PARCELA, COLUNAS_ENDERECO, COLUNAS_LICENCA, PROCESSO, HISTORICO,
    enums: { TIPO_PROCESSO, STATUS_PAGAMENTO, SITUACAO_MONITORAMENTO, ORIGEM_MONITORAMENTO, INCIDENCIA_COTA, CONSTA_DOCUMENTO, TIPO_LICENCA },
  };
})();
