/*
  Warnings:

  - You are about to drop the column `permissao` on the `usuarios` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `parcelas` DROP FOREIGN KEY `parcelas_processo_id_fkey`;

-- DropIndex
DROP INDEX `parcelas_processo_id_fkey` ON `parcelas`;

-- AlterTable
ALTER TABLE `usuarios` DROP COLUMN `permissao`,
    ADD COLUMN `dev` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `alterado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissoes_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PermissaoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PermissaoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_PermissaoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parcelas` ADD CONSTRAINT `parcelas_processo_id_fkey` FOREIGN KEY (`processo_id`) REFERENCES `processos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissaoToUsuario` ADD CONSTRAINT `_PermissaoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissaoToUsuario` ADD CONSTRAINT `_PermissaoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
