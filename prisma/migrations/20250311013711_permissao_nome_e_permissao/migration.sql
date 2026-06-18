/*
  Warnings:

  - You are about to drop the column `descricao` on the `permissoes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[permissao]` on the table `permissoes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `permissao` to the `permissoes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `permissoes_nome_key` ON `permissoes`;

-- AlterTable
ALTER TABLE `permissoes` DROP COLUMN `descricao`,
    ADD COLUMN `permissao` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `permissoes_permissao_key` ON `permissoes`(`permissao`);
