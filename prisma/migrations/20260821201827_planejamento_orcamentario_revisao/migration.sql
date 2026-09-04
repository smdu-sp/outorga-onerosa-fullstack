-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `avatar` TEXT NULL,
    `dev` BOOLEAN NOT NULL DEFAULT false,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_login_key`(`login`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grupos_permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `grupos_permissoes_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `permissao` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissoes_permissao_key`(`permissao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `processos` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PDE', 'COTA', 'AIU') NULL,
    `codigo` VARCHAR(191) NULL,
    `num_processo` VARCHAR(191) NOT NULL,
    `protocolo_ad` VARCHAR(191) NULL,
    `data_entrada` DATE NULL,
    `data_autuacao` DATE NULL,
    `status_pagamento` ENUM('EM_PAGAMENTO', 'QUITADO', 'QUEBRA') NOT NULL DEFAULT 'EM_PAGAMENTO',
    `origem` ENUM('APROVA_DIGITAL', 'SEI', 'SISACOE', 'FISICO', 'PORTAL', 'SLCE') NULL,
    `interessado` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NULL,
    `sql_incra` VARCHAR(191) NULL,
    `sql_formatado` VARCHAR(191) NULL,
    `valor_total_parcelas` DECIMAL(16, 2) NULL,
    `criado_por` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `processos_num_processo_key`(`num_processo`),
    INDEX `processos_status_pagamento_idx`(`status_pagamento`),
    INDEX `processos_tipo_idx`(`tipo`),
    INDEX `processos_origem_idx`(`origem`),
    INDEX `processos_data_entrada_idx`(`data_entrada`),
    INDEX `processos_criado_por_idx`(`criado_por`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `multas` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(16, 2) NOT NULL,
    `status_quitacao` BOOLEAN NOT NULL DEFAULT false,
    `data_quitacao` DATE NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `multas_processo_id_key`(`processo_id`),
    INDEX `multas_status_quitacao_idx`(`status_quitacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sqls` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NULL,
    `quadra` VARCHAR(191) NULL,
    `lote_cadastrado` TEXT NULL,
    `lote_atualizado` TEXT NULL,
    `codigo_logradouro` VARCHAR(191) NULL,
    `coordenada_e` DECIMAL(18, 11) NULL,
    `coordenada_n` DECIMAL(18, 11) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_enderecos` (
    `id` VARCHAR(191) NOT NULL,
    `sql_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NULL,
    `titulo` VARCHAR(191) NULL,
    `nome` TEXT NULL,
    `numero` VARCHAR(191) NULL,

    UNIQUE INDEX `sql_enderecos_sql_id_ordem_key`(`sql_id`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_cota_solidariedade` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `ficha_ouc` INTEGER NULL,
    `proposta_oodc` INTEGER NULL,
    `data_informacao_dmus` DATE NULL,
    `setor` VARCHAR(191) NULL,
    `quadra` VARCHAR(191) NULL,
    `lote` TEXT NULL,
    `lote_atualizado_sqcond` VARCHAR(191) NULL,
    `codigo_logradouro` VARCHAR(191) NULL,
    `endereco` TEXT NULL,
    `proprietario_interessado` TEXT NULL,
    `distrito` VARCHAR(191) NULL,
    `subprefeitura` VARCHAR(191) NULL,
    `macrozona` TEXT NULL,
    `macroarea` TEXT NULL,
    `subsetor` VARCHAR(191) NULL,
    `zona_uso` VARCHAR(191) NULL,
    `subcategoria_uso` TEXT NULL,
    `coeficiente_utilizado` DECIMAL(10, 4) NULL,
    `area_terreno` DECIMAL(14, 2) NULL,
    `valor_m2_quadro14` DECIMAL(14, 2) NULL,
    `alvara_aprovacao` TEXT NULL,
    `alvara_execucao` TEXT NULL,
    `certificado_conclusao` TEXT NULL,
    `observacao` TEXT NULL,
    `origem` ENUM('SISACOE', 'SEI', 'APROVA_DIGITAL', 'OUTRO') NULL,
    `area_habitacao_social` VARCHAR(191) NULL,
    `situacao_cota` TEXT NULL,
    `modalidade` VARCHAR(191) NULL,
    `unidades` VARCHAR(191) NULL,
    `estimativa_deposito_fundurb` DECIMAL(14, 2) NULL,
    `valor_calculado_processo` DECIMAL(14, 2) NULL,
    `valor_pago` DECIMAL(14, 2) NULL,
    `valor_devido` DECIMAL(14, 2) NULL,
    `comprovantes_pagamento_prodam` TEXT NULL,
    `planilha_calculo_cota` ENUM('CONSTA', 'NAO_CONSTA', 'NAO_SE_APLICA') NULL,
    `termo_compromisso_portaria` ENUM('CONSTA', 'NAO_CONSTA', 'NAO_SE_APLICA') NULL,
    `solicitacao_dsiz` TEXT NULL,
    `preenchimento_qgis` TEXT NULL,
    `observacoes` TEXT NULL,
    `ficha_revisada_em` DATE NULL,
    `area_construida_computavel_total` DECIMAL(14, 2) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `monitoramento_cota_solidariedade_processo_id_key`(`processo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_fichas` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `responsavel_preenchimento` VARCHAR(191) NULL,
    `proposta_oodc_id` VARCHAR(191) NULL,
    `numero_proposta` VARCHAR(191) NULL,
    `processo_modificativo` TEXT NULL,
    `proprietario_interessado` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `monitoramento_fichas_processo_id_key`(`processo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_coordenadas` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `coordenada_e` DECIMAL(18, 11) NULL,
    `coordenada_n` DECIMAL(18, 11) NULL,

    UNIQUE INDEX `monitoramento_coordenadas_monitoramento_ficha_id_key`(`monitoramento_ficha_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_localizacao_lote` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NULL,
    `quadra` VARCHAR(191) NULL,
    `lote_cadastrado` TEXT NULL,
    `lote_atualizado` TEXT NULL,
    `codigo_logradouro` VARCHAR(191) NULL,

    UNIQUE INDEX `monitoramento_localizacao_lote_monitoramento_ficha_id_key`(`monitoramento_ficha_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_enderecos` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NULL,
    `titulo` VARCHAR(191) NULL,
    `nome` TEXT NULL,
    `numero` VARCHAR(191) NULL,

    UNIQUE INDEX `monitoramento_enderecos_monitoramento_ficha_id_ordem_key`(`monitoramento_ficha_id`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_enquadramento_urbanistico` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `distrito` VARCHAR(191) NULL,
    `subprefeitura` VARCHAR(191) NULL,
    `macrozona` TEXT NULL,
    `macroarea` TEXT NULL,
    `subsetor` VARCHAR(191) NULL,
    `intervencao_urbanistica` VARCHAR(191) NULL,
    `intervencao_setor` TEXT NULL,
    `zona_uso_1_18081` VARCHAR(191) NULL,
    `zona_uso_2_17975` VARCHAR(191) NULL,
    `zona_uso_3_16402` VARCHAR(191) NULL,
    `zona_uso_4_16050` VARCHAR(191) NULL,
    `zona_uso_5_13885` VARCHAR(191) NULL,
    `zona_uso_6_13885` VARCHAR(191) NULL,
    `tipologia_uso_oodc` VARCHAR(191) NULL,
    `uso` TEXT NULL,

    UNIQUE INDEX `monitoramento_enquadramento_urbanistico_monitoramento_ficha__key`(`monitoramento_ficha_id`),
    INDEX `monitoramento_enquadramento_urbanistico_subprefeitura_idx`(`subprefeitura`),
    INDEX `monitoramento_enquadramento_urbanistico_distrito_idx`(`distrito`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_subcategorias_uso` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `uso_r_hmp_his` TEXT NULL,
    `uso_r_hmp_his_2` VARCHAR(191) NULL,
    `uso_r_hmp_his_3` VARCHAR(191) NULL,
    `uso_nr` TEXT NULL,
    `uso_nr_2` VARCHAR(191) NULL,
    `uso_nr_3` VARCHAR(191) NULL,
    `uso_extra` VARCHAR(191) NULL,

    UNIQUE INDEX `monitoramento_subcategorias_uso_monitoramento_ficha_id_key`(`monitoramento_ficha_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_calculo_outorga` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `fp_uso_r` DECIMAL(10, 4) NULL,
    `fp_uso_nr` DECIMAL(10, 4) NULL,
    `fs_uso_r` DECIMAL(10, 4) NULL,
    `fs_uso_nr` DECIMAL(10, 4) NULL,
    `area_objeto_uso_r` DECIMAL(14, 2) NULL,
    `area_objeto_uso_nr` DECIMAL(14, 2) NULL,
    `area_total_objeto` DECIMAL(14, 2) NULL,
    `area_nao_computavel` TEXT NULL,
    `area_nao_computavel_incidente` TEXT NULL,
    `area_nao_computavel_final` TEXT NULL,
    `percentual_fachada_ativa` DECIMAL(5, 2) NULL,
    `area_computavel_total` DECIMAL(14, 2) NULL,
    `area_construida_total` DECIMAL(14, 2) NULL,
    `contrapartida_uso_r` DECIMAL(14, 2) NULL,
    `contrapartida_uso_nr` DECIMAL(14, 2) NULL,
    `contrapartida_total` DECIMAL(14, 2) NULL,
    `coeficiente_basico` DECIMAL(10, 4) NULL,
    `coeficiente_utilizado` DECIMAL(10, 4) NULL,
    `area_terreno` DECIMAL(14, 2) NULL,
    `valor_m2_quadro14` DECIMAL(14, 2) NULL,
    `area_fruicao_publica` DECIMAL(14, 2) NULL,
    `area_doacao_melhoramento` DECIMAL(14, 2) NULL,
    `area_doacao_calcada` DECIMAL(14, 2) NULL,
    `area_transferencia` DECIMAL(14, 2) NULL,
    `area_habitacao_social` DECIMAL(14, 2) NULL,

    UNIQUE INDEX `monitoramento_calculo_outorga_monitoramento_ficha_id_key`(`monitoramento_ficha_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_situacao` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `incidencia_cota_solidariedade` ENUM('SIM', 'NAO') NULL,
    `situacao` ENUM('QUITADO', 'ARRECADADO_AD', 'EM_PAGAMENTO', 'SEM_INFORMACAO') NULL,
    `origem` ENUM('SISACOE', 'SEI', 'APROVA_DIGITAL', 'OUTRO') NULL,

    UNIQUE INDEX `monitoramento_situacao_monitoramento_ficha_id_key`(`monitoramento_ficha_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_licencas` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('APROVACAO', 'EXECUCAO', 'CERTIFICADO_CONCLUSAO') NOT NULL,
    `numero` TEXT NULL,
    `tipo_documento` VARCHAR(191) NULL,
    `data_expedicao` DATE NULL,

    UNIQUE INDEX `monitoramento_licencas_monitoramento_ficha_id_tipo_key`(`monitoramento_ficha_id`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoramento_anotacoes_deuso` (
    `id` VARCHAR(191) NOT NULL,
    `monitoramento_ficha_id` VARCHAR(191) NOT NULL,
    `observacao_historico` TEXT NULL,
    `data_informacao_dmus` DATE NULL,
    `solicitacao_dsiz` TEXT NULL,
    `preenchimento_qgis` TEXT NULL,

    UNIQUE INDEX `monitoramento_anotacoes_deuso_monitoramento_ficha_id_key`(`monitoramento_ficha_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parcelas` (
    `id` VARCHAR(191) NOT NULL,
    `obrigacao` ENUM('PDE', 'COTA', 'AIU') NULL,
    `num_parcela` INTEGER NOT NULL,
    `valor` DOUBLE NOT NULL,
    `vencimento` DATE NOT NULL,
    `data_quitacao` DATE NULL,
    `ano_pagamento` INTEGER NULL,
    `cpf_cnpj` VARCHAR(191) NULL,
    `status_quitacao` BOOLEAN NOT NULL DEFAULT false,
    `antecipada` BOOLEAN NOT NULL DEFAULT false,
    `quebra` BOOLEAN NOT NULL DEFAULT false,
    `dias_antecipacao` INTEGER NULL,
    `mes_competencia` VARCHAR(191) NULL,
    `mes_arrecadacao` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processo_id` VARCHAR(191) NOT NULL,

    INDEX `parcelas_vencimento_idx`(`vencimento`),
    INDEX `parcelas_status_quitacao_idx`(`status_quitacao`),
    INDEX `parcelas_processo_id_obrigacao_idx`(`processo_id`, `obrigacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_divisoes` (
    `id` VARCHAR(191) NOT NULL,
    `coordenadoria` ENUM('RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS') NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lic_divisoes_coordenadoria_codigo_key`(`coordenadoria`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_assuntos` (
    `id` VARCHAR(191) NOT NULL,
    `coordenadoria` ENUM('RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS') NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_assuntos_coordenadoria_idx`(`coordenadoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_situacoes` (
    `id` VARCHAR(191) NOT NULL,
    `coordenadoria` ENUM('RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS') NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `encerra` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_situacoes_codigo_idx`(`codigo`),
    UNIQUE INDEX `lic_situacoes_coordenadoria_codigo_key`(`coordenadoria`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_tipos_evento` (
    `id` VARCHAR(191) NOT NULL,
    `coordenadoria` ENUM('RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS') NULL,
    `categoria` ENUM('TECNICO', 'ADMINISTRATIVO', 'AUTOMATICO') NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_tipos_evento_categoria_idx`(`categoria`),
    UNIQUE INDEX `lic_tipos_evento_coordenadoria_categoria_codigo_key`(`coordenadoria`, `categoria`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_categorias` (
    `id` VARCHAR(191) NOT NULL,
    `coordenadoria` ENUM('RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS') NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lic_categorias_coordenadoria_codigo_key`(`coordenadoria`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_processos` (
    `id` VARCHAR(191) NOT NULL,
    `coordenadoria` ENUM('RESID', 'SERVIN', 'COMIN', 'CAEPP', 'PARHIS') NOT NULL,
    `status_ciclo` ENUM('ATIVO', 'ENCERRADO') NOT NULL DEFAULT 'ATIVO',
    `tipo_sistema` ENUM('SEI', 'FISICO', 'AD') NULL,
    `num_processo` VARCHAR(191) NOT NULL,
    `protocolo` VARCHAR(191) NULL,
    `prioritario` BOOLEAN NOT NULL DEFAULT false,
    `processo_relacionado` VARCHAR(191) NULL,
    `equipamento_publico` BOOLEAN NOT NULL DEFAULT false,
    `instancia` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `data_autuacao` DATE NULL,
    `data_envio_coordenadoria` DATE NULL,
    `data_ult_dist_diretoria` DATE NULL,
    `data_ult_dist_tecnico` DATE NULL,
    `data_despacho_doc` DATE NULL,
    `area_terreno_m2` DECIMAL(16, 2) NULL,
    `area_construcao_inicial_m2` DECIMAL(16, 2) NULL,
    `area_construcao_final_m2` DECIMAL(16, 2) NULL,
    `zona` VARCHAR(191) NULL,
    `categoria_uso` VARCHAR(191) NULL,
    `descricao_uso` TEXT NULL,
    `subprefeitura` VARCHAR(191) NULL,
    `base_legal_pde` VARCHAR(191) NULL,
    `base_legal_lpuos` VARCHAR(191) NULL,
    `base_legal_coe` VARCHAR(191) NULL,
    `legislacao_especifica` TEXT NULL,
    `documento_referencia` VARCHAR(191) NULL,
    `divisao_id` VARCHAR(191) NULL,
    `assunto_id` VARCHAR(191) NULL,
    `situacao_id` VARCHAR(191) NULL,
    `tecnico_atual_id` VARCHAR(191) NULL,
    `processo_outorga_id` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lic_processos_num_processo_key`(`num_processo`),
    UNIQUE INDEX `lic_processos_processo_outorga_id_key`(`processo_outorga_id`),
    INDEX `lic_processos_coordenadoria_idx`(`coordenadoria`),
    INDEX `lic_processos_status_ciclo_idx`(`status_ciclo`),
    INDEX `lic_processos_tipo_sistema_idx`(`tipo_sistema`),
    INDEX `lic_processos_tecnico_atual_id_idx`(`tecnico_atual_id`),
    INDEX `lic_processos_situacao_id_idx`(`situacao_id`),
    INDEX `lic_processos_divisao_id_idx`(`divisao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_processo_imoveis` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PRINCIPAL', 'COMPLEMENTAR') NOT NULL DEFAULT 'COMPLEMENTAR',
    `identificador` VARCHAR(191) NULL,
    `logradouro` TEXT NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_processo_imoveis_processo_id_idx`(`processo_id`),
    INDEX `lic_processo_imoveis_identificador_idx`(`identificador`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_processo_interessados` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf_cnpj` VARCHAR(191) NULL,
    `tipo_vinculo` VARCHAR(191) NOT NULL DEFAULT 'PRINCIPAL',
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_processo_interessados_processo_id_idx`(`processo_id`),
    INDEX `lic_processo_interessados_nome_idx`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_processo_incidencias` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `flag` BOOLEAN NOT NULL DEFAULT false,
    `valor` DECIMAL(16, 2) NULL,
    `data_doc` DATE NULL,
    `numero_documento` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lic_processo_incidencias_processo_id_tipo_key`(`processo_id`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_processo_categorias` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `categoria_id` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lic_processo_categorias_processo_id_categoria_id_key`(`processo_id`, `categoria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_eventos` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `categoria` ENUM('TECNICO', 'ADMINISTRATIVO', 'AUTOMATICO') NOT NULL,
    `tipo_evento_id` VARCHAR(191) NULL,
    `tecnico_id` VARCHAR(191) NULL,
    `data_inicio` DATE NULL,
    `data_termino` DATE NULL,
    `descricao` TEXT NULL,
    `observacao` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_eventos_processo_id_idx`(`processo_id`),
    INDEX `lic_eventos_tecnico_id_idx`(`tecnico_id`),
    INDEX `lic_eventos_tipo_evento_id_idx`(`tipo_evento_id`),
    INDEX `lic_eventos_data_inicio_idx`(`data_inicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_distribuicoes` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('DIRETORIA', 'TECNICO') NOT NULL,
    `destino` VARCHAR(191) NULL,
    `tecnico_id` VARCHAR(191) NULL,
    `data_inicio` DATE NULL,
    `data_fim` DATE NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_distribuicoes_processo_id_idx`(`processo_id`),
    INDEX `lic_distribuicoes_tecnico_id_idx`(`tecnico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_oficios` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `data_email_enviado` DATE NULL,
    `data_recebimento_resposta` DATE NULL,
    `data_encerramento` DATE NULL,
    `interessado_nome` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `tecnico_id` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_oficios_processo_id_idx`(`processo_id`),
    INDEX `lic_oficios_numero_idx`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_arquivamentos` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `situacao` VARCHAR(191) NULL,
    `local` VARCHAR(191) NULL,
    `container` VARCHAR(191) NULL,
    `caixa` VARCHAR(191) NULL,
    `posicao` VARCHAR(191) NULL,
    `quantidade_volumes` INTEGER NULL,
    `quantidade_caixas` INTEGER NULL,
    `data_arquivamento` DATE NULL,
    `observacao` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lic_arquivamentos_processo_id_key`(`processo_id`),
    INDEX `lic_arquivamentos_container_idx`(`container`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lic_auditorias` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NULL,
    `tipo_alteracao` VARCHAR(191) NOT NULL,
    `valor_anterior` TEXT NULL,
    `valor_novo` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lic_auditorias_processo_id_idx`(`processo_id`),
    INDEX `lic_auditorias_criado_em_idx`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oodc_valores_referencia` (
    `id` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NOT NULL,
    `quadra` VARCHAR(191) NOT NULL,
    `codlog` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(14, 4) NOT NULL,
    `data_inicio_vigencia` DATE NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `oodc_valores_referencia_setor_quadra_codlog_idx`(`setor`, `quadra`, `codlog`),
    UNIQUE INDEX `oodc_valores_referencia_setor_quadra_codlog_data_inicio_vige_key`(`setor`, `quadra`, `codlog`, `data_inicio_vigencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oodc_memorial_calculo` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `id_assunto` INTEGER NOT NULL,
    `id_legislacao` INTEGER NOT NULL,
    `legislacao_origem` VARCHAR(191) NOT NULL,
    `legislacao_observacao` TEXT NULL,
    `id_macrozona` INTEGER NOT NULL,
    `id_macroarea` INTEGER NOT NULL,
    `id_zona` INTEGER NOT NULL,
    `id_area_aiu` INTEGER NULL,
    `area_res_fruicao_m2` DECIMAL(14, 2) NOT NULL,
    `base_legal_frui_id` INTEGER NOT NULL,
    `area_doacao_verde_m2` DECIMAL(14, 2) NOT NULL,
    `area_doacao_melhoramento_m2` DECIMAL(14, 2) NOT NULL,
    `base_legal_mel_id` INTEGER NOT NULL,
    `area_reserva_praca_m2` DECIMAL(14, 2) NOT NULL,
    `area_doacao_calcada_m2` DECIMAL(14, 2) NOT NULL,
    `base_legal_cal_id` INTEGER NOT NULL,
    `area_reserva_calcada_m2` DECIMAL(14, 2) NOT NULL,
    `area_desapropriacao_melhoramento_m2` DECIMAL(14, 2) NOT NULL,
    `base_legal_des_mel_id` INTEGER NOT NULL,
    `cota_parte_maxima_m2` DECIMAL(14, 2) NOT NULL,
    `outorga_projeto_anterior_rs` DECIMAL(14, 2) NOT NULL,
    `incentivo_certificacao_rs` DECIMAL(14, 2) NOT NULL,
    `incentivo_cota_ambiental_rs` DECIMAL(14, 2) NOT NULL,
    `outorga_projeto_modificativo_rs` DECIMAL(14, 2) NOT NULL,
    `outorga_apoio_urbano_sul_rs` DECIMAL(14, 2) NOT NULL,
    `id_classificacao_empreendimento` INTEGER NOT NULL,
    `opcao_expressa_regime_novo` BOOLEAN NOT NULL DEFAULT false,
    `despacho_decisorio_emitido` BOOLEAN NOT NULL DEFAULT false,
    `data_referencia` DATE NOT NULL,
    `v_max` DECIMAL(14, 4) NULL,
    `soma_terreno_m2` DECIMAL(14, 2) NOT NULL,
    `soma_computavel_m2` DECIMAL(14, 2) NOT NULL,
    `soma_tdc_m2` DECIMAL(14, 2) NOT NULL,
    `soma_outorga_adquirida_m2` DECIMAL(14, 2) NOT NULL,
    `soma_beneficio_m2` DECIMAL(14, 2) NOT NULL,
    `soma_outorga_m2` DECIMAL(14, 2) NOT NULL,
    `valor_total_bruto_rs` DECIMAL(14, 2) NOT NULL,
    `deducao_ehis_ezeis_rs` DECIMAL(14, 2) NOT NULL,
    `valor_total_recolhido_rs` DECIMAL(14, 2) NOT NULL,
    `valor_total_liquido_rs` DECIMAL(14, 2) NOT NULL,
    `dentro_da_vigencia` BOOLEAN NOT NULL,
    `criado_por` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `oodc_memorial_calculo_processo_id_idx`(`processo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oodc_memorial_enderecos` (
    `id` VARCHAR(191) NOT NULL,
    `memorial_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `setor` VARCHAR(191) NOT NULL,
    `quadra` VARCHAR(191) NOT NULL,
    `codlog` VARCHAR(191) NOT NULL,
    `valor_encontrado` DECIMAL(14, 4) NULL,
    `data_vigencia` DATE NULL,

    UNIQUE INDEX `oodc_memorial_enderecos_memorial_id_ordem_key`(`memorial_id`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oodc_memorial_tipologias` (
    `id` VARCHAR(191) NOT NULL,
    `memorial_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `id_tipologia` INTEGER NOT NULL,
    `ca_basico` DECIMAL(10, 4) NOT NULL,
    `ca_maximo` DECIMAL(10, 4) NOT NULL,
    `terreno_m2` DECIMAL(14, 2) NOT NULL,
    `computavel_m2` DECIMAL(14, 2) NOT NULL,
    `tdc_m2` DECIMAL(14, 2) NOT NULL,
    `outorga_adquirida_m2` DECIMAL(14, 2) NOT NULL,
    `fp` DECIMAL(10, 4) NOT NULL,
    `fs` DECIMAL(10, 4) NOT NULL,
    `ca_adicional` DECIMAL(10, 4) NOT NULL,
    `beneficio_m2` DECIMAL(14, 2) NOT NULL,
    `objeto_outorga_m2` DECIMAL(14, 2) NOT NULL,
    `c_rs_m2` DECIMAL(14, 4) NOT NULL,
    `valor_rs` DECIMAL(14, 2) NOT NULL,

    UNIQUE INDEX `oodc_memorial_tipologias_memorial_id_ordem_key`(`memorial_id`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planejamento_orcamentario` (
    `id` VARCHAR(191) NOT NULL,
    `ano` INTEGER NOT NULL,
    `media_base_3_anos` DECIMAL(16, 2) NOT NULL,
    `valor_anual` DECIMAL(16, 2) NOT NULL,
    `metodo_distribuicao` ENUM('MEDIA_HISTORICA', 'IGUAL') NOT NULL DEFAULT 'MEDIA_HISTORICA',
    `criado_por` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `planejamento_orcamentario_ano_key`(`ano`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planejamento_parametros_correcao` (
    `id` VARCHAR(191) NOT NULL,
    `planejamento_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `percentual` DECIMAL(7, 4) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planejamento_orcamentario_meses` (
    `id` VARCHAR(191) NOT NULL,
    `planejamento_id` VARCHAR(191) NOT NULL,
    `mes` INTEGER NOT NULL,
    `valor` DECIMAL(16, 2) NOT NULL,
    `editado_manualmente` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `planejamento_orcamentario_meses_planejamento_id_mes_key`(`planejamento_id`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planejamento_historico_ano` (
    `id` VARCHAR(191) NOT NULL,
    `planejamento_id` VARCHAR(191) NOT NULL,
    `ano` INTEGER NOT NULL,
    `valor_real` DECIMAL(16, 2) NOT NULL,
    `valor_ajustado` DECIMAL(16, 2) NULL,

    UNIQUE INDEX `planejamento_historico_ano_planejamento_id_ano_key`(`planejamento_id`, `ano`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planejamento_revisoes` (
    `id` VARCHAR(191) NOT NULL,
    `planejamento_id` VARCHAR(191) NOT NULL,
    `motivo` TEXT NOT NULL,
    `valor_anual_anterior` DECIMAL(16, 2) NOT NULL,
    `valor_anual_novo` DECIMAL(16, 2) NOT NULL,
    `snapshot_parametros_anterior` JSON NOT NULL,
    `snapshot_meses_anterior` JSON NOT NULL,
    `snapshot_historico_anterior` JSON NOT NULL,
    `revisado_por` VARCHAR(191) NULL,
    `revisado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracao_planejamento` (
    `id` VARCHAR(191) NOT NULL,
    `dia_limite` INTEGER NOT NULL,
    `mes_limite` INTEGER NOT NULL,
    `alterado_por` VARCHAR(191) NULL,
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GrupoPermissaoToPermissao` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_GrupoPermissaoToPermissao_AB_unique`(`A`, `B`),
    INDEX `_GrupoPermissaoToPermissao_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GrupoPermissaoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_GrupoPermissaoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_GrupoPermissaoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PermissaoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PermissaoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_PermissaoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `processos` ADD CONSTRAINT `processos_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `multas` ADD CONSTRAINT `multas_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sqls` ADD CONSTRAINT `sqls_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sql_enderecos` ADD CONSTRAINT `sql_enderecos_sql_id_fkey` FOREIGN KEY (`sql_id`) REFERENCES `sqls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_cota_solidariedade` ADD CONSTRAINT `monitoramento_cota_solidariedade_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_fichas` ADD CONSTRAINT `monitoramento_fichas_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_coordenadas` ADD CONSTRAINT `monitoramento_coordenadas_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_localizacao_lote` ADD CONSTRAINT `monitoramento_localizacao_lote_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_enderecos` ADD CONSTRAINT `monitoramento_enderecos_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_enquadramento_urbanistico` ADD CONSTRAINT `monitoramento_enquadramento_urbanistico_monitoramento_ficha_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_subcategorias_uso` ADD CONSTRAINT `monitoramento_subcategorias_uso_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_calculo_outorga` ADD CONSTRAINT `monitoramento_calculo_outorga_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_situacao` ADD CONSTRAINT `monitoramento_situacao_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_licencas` ADD CONSTRAINT `monitoramento_licencas_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoramento_anotacoes_deuso` ADD CONSTRAINT `monitoramento_anotacoes_deuso_monitoramento_ficha_id_fkey` FOREIGN KEY (`monitoramento_ficha_id`) REFERENCES `monitoramento_fichas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parcelas` ADD CONSTRAINT `parcelas_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processos` ADD CONSTRAINT `lic_processos_divisao_id_fkey` FOREIGN KEY (`divisao_id`) REFERENCES `lic_divisoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processos` ADD CONSTRAINT `lic_processos_assunto_id_fkey` FOREIGN KEY (`assunto_id`) REFERENCES `lic_assuntos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processos` ADD CONSTRAINT `lic_processos_situacao_id_fkey` FOREIGN KEY (`situacao_id`) REFERENCES `lic_situacoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processos` ADD CONSTRAINT `lic_processos_tecnico_atual_id_fkey` FOREIGN KEY (`tecnico_atual_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processos` ADD CONSTRAINT `lic_processos_processo_outorga_id_fkey` FOREIGN KEY (`processo_outorga_id`) REFERENCES `processos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processo_imoveis` ADD CONSTRAINT `lic_processo_imoveis_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processo_interessados` ADD CONSTRAINT `lic_processo_interessados_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processo_incidencias` ADD CONSTRAINT `lic_processo_incidencias_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processo_categorias` ADD CONSTRAINT `lic_processo_categorias_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_processo_categorias` ADD CONSTRAINT `lic_processo_categorias_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `lic_categorias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_eventos` ADD CONSTRAINT `lic_eventos_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_eventos` ADD CONSTRAINT `lic_eventos_tipo_evento_id_fkey` FOREIGN KEY (`tipo_evento_id`) REFERENCES `lic_tipos_evento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_eventos` ADD CONSTRAINT `lic_eventos_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_distribuicoes` ADD CONSTRAINT `lic_distribuicoes_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_distribuicoes` ADD CONSTRAINT `lic_distribuicoes_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_oficios` ADD CONSTRAINT `lic_oficios_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_oficios` ADD CONSTRAINT `lic_oficios_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_arquivamentos` ADD CONSTRAINT `lic_arquivamentos_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_auditorias` ADD CONSTRAINT `lic_auditorias_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `lic_processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lic_auditorias` ADD CONSTRAINT `lic_auditorias_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_calculo` ADD CONSTRAINT `oodc_memorial_calculo_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_calculo` ADD CONSTRAINT `oodc_memorial_calculo_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_enderecos` ADD CONSTRAINT `oodc_memorial_enderecos_memorial_id_fkey` FOREIGN KEY (`memorial_id`) REFERENCES `oodc_memorial_calculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_tipologias` ADD CONSTRAINT `oodc_memorial_tipologias_memorial_id_fkey` FOREIGN KEY (`memorial_id`) REFERENCES `oodc_memorial_calculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_orcamentario` ADD CONSTRAINT `planejamento_orcamentario_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_parametros_correcao` ADD CONSTRAINT `planejamento_parametros_correcao_planejamento_id_fkey` FOREIGN KEY (`planejamento_id`) REFERENCES `planejamento_orcamentario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_orcamentario_meses` ADD CONSTRAINT `planejamento_orcamentario_meses_planejamento_id_fkey` FOREIGN KEY (`planejamento_id`) REFERENCES `planejamento_orcamentario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_historico_ano` ADD CONSTRAINT `planejamento_historico_ano_planejamento_id_fkey` FOREIGN KEY (`planejamento_id`) REFERENCES `planejamento_orcamentario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_revisoes` ADD CONSTRAINT `planejamento_revisoes_planejamento_id_fkey` FOREIGN KEY (`planejamento_id`) REFERENCES `planejamento_orcamentario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_revisoes` ADD CONSTRAINT `planejamento_revisoes_revisado_por_fkey` FOREIGN KEY (`revisado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToPermissao` ADD CONSTRAINT `_GrupoPermissaoToPermissao_A_fkey` FOREIGN KEY (`A`) REFERENCES `grupos_permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToPermissao` ADD CONSTRAINT `_GrupoPermissaoToPermissao_B_fkey` FOREIGN KEY (`B`) REFERENCES `permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToUsuario` ADD CONSTRAINT `_GrupoPermissaoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `grupos_permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToUsuario` ADD CONSTRAINT `_GrupoPermissaoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissaoToUsuario` ADD CONSTRAINT `_PermissaoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissaoToUsuario` ADD CONSTRAINT `_PermissaoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
