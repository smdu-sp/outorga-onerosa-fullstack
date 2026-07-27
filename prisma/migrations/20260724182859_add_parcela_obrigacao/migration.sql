-- AlterTable
ALTER TABLE `parcelas` ADD COLUMN `obrigacao` ENUM('PDE', 'COTA', 'AIU') NULL;

-- CreateIndex
CREATE INDEX `parcelas_processo_id_obrigacao_idx` ON `parcelas`(`processo_id`, `obrigacao`);
