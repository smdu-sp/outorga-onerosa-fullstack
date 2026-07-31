-- AlterTable
ALTER TABLE `processos` ADD COLUMN `data_autuacao` DATE NULL,
    ADD COLUMN `sql_formatado` VARCHAR(191) NULL,
    ADD COLUMN `sql_incra` VARCHAR(191) NULL;

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

-- AddForeignKey
ALTER TABLE `multas` ADD CONSTRAINT `multas_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
