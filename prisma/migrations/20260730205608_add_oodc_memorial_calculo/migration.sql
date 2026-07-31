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

-- AddForeignKey
ALTER TABLE `oodc_memorial_calculo` ADD CONSTRAINT `oodc_memorial_calculo_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_calculo` ADD CONSTRAINT `oodc_memorial_calculo_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_enderecos` ADD CONSTRAINT `oodc_memorial_enderecos_memorial_id_fkey` FOREIGN KEY (`memorial_id`) REFERENCES `oodc_memorial_calculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oodc_memorial_tipologias` ADD CONSTRAINT `oodc_memorial_tipologias_memorial_id_fkey` FOREIGN KEY (`memorial_id`) REFERENCES `oodc_memorial_calculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
