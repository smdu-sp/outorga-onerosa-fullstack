-- AlterTable
ALTER TABLE `processos` ADD COLUMN `criado_por` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `processos_criado_por_idx` ON `processos`(`criado_por`);

-- AddForeignKey
ALTER TABLE `processos` ADD CONSTRAINT `processos_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
