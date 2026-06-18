-- CreateTable
CREATE TABLE `processos` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PDE', 'COTA') NULL,
    `codigo` INTEGER NULL,
    `num_processo` VARCHAR(191) NOT NULL,
    `protocolo_ad` VARCHAR(191) NULL,
    `cpf_cnpj` VARCHAR(191) NOT NULL,
    `data_entrada` DATE NOT NULL,

    UNIQUE INDEX `processos_num_processo_key`(`num_processo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parcelas` (
    `id` VARCHAR(191) NOT NULL,
    `num_parcela` INTEGER NOT NULL,
    `valor` DOUBLE NOT NULL,
    `vencimento` DATE NOT NULL,
    `data_quitacao` DATE NULL,
    `ano_pagamento` INTEGER NOT NULL,
    `status_quitacao` BOOLEAN NOT NULL DEFAULT false,
    `processo_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parcelas` ADD CONSTRAINT `parcelas_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
