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
