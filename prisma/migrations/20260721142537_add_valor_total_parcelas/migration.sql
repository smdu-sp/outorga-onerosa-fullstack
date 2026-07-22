-- Total materializado por processo = SUM(parcelas.valor).
-- Mantido por prisma/backfill-totais.ts.

-- AlterTable
ALTER TABLE `processos` ADD COLUMN `valor_total_parcelas` DECIMAL(16, 2) NULL;
