-- CreateTable
CREATE TABLE `cota_valores_referencia` (
    `id` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NOT NULL,
    `quadra` VARCHAR(191) NOT NULL,
    `codlog` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(14, 4) NOT NULL,
    `observacao` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cota_valores_referencia_setor_quadra_codlog_idx`(`setor`, `quadra`, `codlog`),
    UNIQUE INDEX `cota_valores_referencia_setor_quadra_codlog_key`(`setor`, `quadra`, `codlog`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cota_memorial_calculo` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `area_terreno_escritura_m2` DECIMAL(14, 2) NOT NULL,
    `area_terreno_real_m2` DECIMAL(14, 2) NOT NULL,
    `terreno_usado_m2` DECIMAL(14, 2) NOT NULL,
    `ano_calculo` INTEGER NULL,
    `numero_parcelas` INTEGER NULL,
    `v_max` DECIMAL(14, 4) NULL,
    `valor_total_rs` DECIMAL(14, 2) NOT NULL,
    `valor_cinquenta_pct_rs` DECIMAL(14, 2) NOT NULL,
    `criado_por` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cota_memorial_calculo_processo_id_idx`(`processo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cota_memorial_enderecos` (
    `id` VARCHAR(191) NOT NULL,
    `memorial_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `setor` VARCHAR(191) NOT NULL,
    `quadra` VARCHAR(191) NOT NULL,
    `codlog` VARCHAR(191) NOT NULL,
    `valor_encontrado` DECIMAL(14, 4) NULL,

    UNIQUE INDEX `cota_memorial_enderecos_memorial_id_ordem_key`(`memorial_id`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cota_memorial_calculo` ADD CONSTRAINT `cota_memorial_calculo_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cota_memorial_calculo` ADD CONSTRAINT `cota_memorial_calculo_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cota_memorial_enderecos` ADD CONSTRAINT `cota_memorial_enderecos_memorial_id_fkey` FOREIGN KEY (`memorial_id`) REFERENCES `cota_memorial_calculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
