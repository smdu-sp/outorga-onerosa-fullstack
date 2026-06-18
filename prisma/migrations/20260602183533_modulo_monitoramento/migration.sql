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
    `zona_uso_1_18081` VARCHAR(191) NULL,
    `zona_uso_2_17975` VARCHAR(191) NULL,
    `zona_uso_3_16402` VARCHAR(191) NULL,
    `zona_uso_4_16050` VARCHAR(191) NULL,
    `zona_uso_5_13885` VARCHAR(191) NULL,
    `zona_uso_6_13885` VARCHAR(191) NULL,
    `tipologia_uso_oodc` VARCHAR(191) NULL,

    UNIQUE INDEX `monitoramento_enquadramento_urbanistico_monitoramento_ficha__key`(`monitoramento_ficha_id`),
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
    `fp_uso_r` VARCHAR(191) NULL,
    `fp_uso_nr` VARCHAR(191) NULL,
    `fs_uso_r` VARCHAR(191) NULL,
    `fs_uso_nr` VARCHAR(191) NULL,
    `area_objeto_uso_r` VARCHAR(191) NULL,
    `area_objeto_uso_nr` VARCHAR(191) NULL,
    `area_total_objeto` VARCHAR(191) NULL,
    `area_nao_computavel` TEXT NULL,
    `area_nao_computavel_incidente` TEXT NULL,
    `area_nao_computavel_final` TEXT NULL,
    `percentual_fachada_ativa` VARCHAR(191) NULL,
    `area_computavel_total` DECIMAL(14, 2) NULL,
    `area_construida_total` DECIMAL(14, 2) NULL,
    `contrapartida_uso_r` VARCHAR(191) NULL,
    `contrapartida_uso_nr` VARCHAR(191) NULL,
    `contrapartida_total` VARCHAR(191) NULL,
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
