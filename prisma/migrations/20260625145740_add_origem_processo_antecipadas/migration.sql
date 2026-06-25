-- AlterTable
ALTER TABLE `parcelas` ADD COLUMN `dias_antecipacao` INTEGER NULL,
    ADD COLUMN `mes_arrecadacao` VARCHAR(191) NULL,
    ADD COLUMN `mes_competencia` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `processos` ADD COLUMN `origem` ENUM('APROVA_DIGITAL', 'SEI', 'FISICO', 'PORTAL') NULL,
    MODIFY `tipo` ENUM('PDE', 'COTA', 'AIU') NULL;
