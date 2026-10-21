-- CreateTable
CREATE TABLE `consultas_dados_faltantes` (
    `id` VARCHAR(191) NOT NULL,
    `processo_id` VARCHAR(191) NOT NULL,
    `tipo_consulta` VARCHAR(191) NOT NULL DEFAULT 'BACKFILL',
    `status` ENUM('ENCONTRADO', 'NAO_ENCONTRADO', 'ERRO') NOT NULL,
    `fonte` VARCHAR(191) NULL,
    `encontrado_bi` BOOLEAN NULL,
    `sql` VARCHAR(191) NULL,
    `tipologia` VARCHAR(191) NULL,
    `detalhe` TEXT NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 1,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `consultado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `consultas_dados_faltantes_processo_id_key`(`processo_id`),
    INDEX `consultas_dados_faltantes_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consultas_dados_faltantes` ADD CONSTRAINT `consultas_dados_faltantes_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

