/*
  Warnings:

  - Added the required column `area_desapropriacao_melhoramento_m2` to the `oodc_memorial_calculo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `area_reserva_calcada_m2` to the `oodc_memorial_calculo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `base_legal_des_mel_id` to the `oodc_memorial_calculo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `oodc_memorial_calculo` ADD COLUMN `area_desapropriacao_melhoramento_m2` DECIMAL(14, 2) NOT NULL,
    ADD COLUMN `area_reserva_calcada_m2` DECIMAL(14, 2) NOT NULL,
    ADD COLUMN `base_legal_des_mel_id` INTEGER NOT NULL;
