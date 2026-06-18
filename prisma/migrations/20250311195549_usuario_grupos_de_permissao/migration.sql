-- CreateTable
CREATE TABLE `_GrupoPermissaoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_GrupoPermissaoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_GrupoPermissaoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToUsuario` ADD CONSTRAINT `_GrupoPermissaoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `grupos_permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToUsuario` ADD CONSTRAINT `_GrupoPermissaoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
