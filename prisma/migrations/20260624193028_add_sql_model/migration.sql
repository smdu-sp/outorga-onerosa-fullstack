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

-- AddForeignKey
ALTER TABLE `sqls` ADD CONSTRAINT `sqls_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sql_enderecos` ADD CONSTRAINT `sql_enderecos_sql_id_fkey` FOREIGN KEY (`sql_id`) REFERENCES `sqls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
