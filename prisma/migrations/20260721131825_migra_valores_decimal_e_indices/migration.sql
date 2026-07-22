-- Migração String -> Decimal dos campos monetários/área do monitoramento.
-- Os valores de `contrapartida_total` (477 linhas) foram normalizados para texto
-- canônico "1234.56" antes desta migração (prisma/normalizar-valores-monetarios.ts),
-- então o cast VarChar -> Decimal é seguro. Os demais campos estão 100% nulos.

-- AlterTable
ALTER TABLE `monitoramento_calculo_outorga` MODIFY `fp_uso_r` DECIMAL(10, 4) NULL,
    MODIFY `fp_uso_nr` DECIMAL(10, 4) NULL,
    MODIFY `fs_uso_r` DECIMAL(10, 4) NULL,
    MODIFY `fs_uso_nr` DECIMAL(10, 4) NULL,
    MODIFY `area_objeto_uso_r` DECIMAL(14, 2) NULL,
    MODIFY `area_objeto_uso_nr` DECIMAL(14, 2) NULL,
    MODIFY `area_total_objeto` DECIMAL(14, 2) NULL,
    MODIFY `percentual_fachada_ativa` DECIMAL(5, 2) NULL,
    MODIFY `contrapartida_uso_r` DECIMAL(14, 2) NULL,
    MODIFY `contrapartida_uso_nr` DECIMAL(14, 2) NULL,
    MODIFY `contrapartida_total` DECIMAL(14, 2) NULL;

-- AlterTable
ALTER TABLE `monitoramento_cota_solidariedade` MODIFY `valor_pago` DECIMAL(14, 2) NULL,
    MODIFY `valor_devido` DECIMAL(14, 2) NULL;

-- CreateIndex
CREATE INDEX `monitoramento_enquadramento_urbanistico_subprefeitura_idx` ON `monitoramento_enquadramento_urbanistico`(`subprefeitura`);

-- CreateIndex
CREATE INDEX `monitoramento_enquadramento_urbanistico_distrito_idx` ON `monitoramento_enquadramento_urbanistico`(`distrito`);

-- CreateIndex
CREATE INDEX `parcelas_vencimento_idx` ON `parcelas`(`vencimento`);

-- CreateIndex
CREATE INDEX `parcelas_status_quitacao_idx` ON `parcelas`(`status_quitacao`);

-- CreateIndex
CREATE INDEX `processos_status_pagamento_idx` ON `processos`(`status_pagamento`);

-- CreateIndex
CREATE INDEX `processos_tipo_idx` ON `processos`(`tipo`);

-- CreateIndex
CREATE INDEX `processos_origem_idx` ON `processos`(`origem`);

-- CreateIndex
CREATE INDEX `processos_data_entrada_idx` ON `processos`(`data_entrada`);
