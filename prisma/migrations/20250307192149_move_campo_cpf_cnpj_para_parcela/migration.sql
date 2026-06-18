/*
  Warnings:

  - You are about to drop the column `cpf_cnpj` on the `processos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `parcelas` ADD COLUMN `cpf_cnpj` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `processos` DROP COLUMN `cpf_cnpj`;
