-- CreateTable
CREATE TABLE `grupos_permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `grupos_permissoes_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GrupoPermissaoToPermissao` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_GrupoPermissaoToPermissao_AB_unique`(`A`, `B`),
    INDEX `_GrupoPermissaoToPermissao_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToPermissao` ADD CONSTRAINT `_GrupoPermissaoToPermissao_A_fkey` FOREIGN KEY (`A`) REFERENCES `grupos_permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GrupoPermissaoToPermissao` ADD CONSTRAINT `_GrupoPermissaoToPermissao_B_fkey` FOREIGN KEY (`B`) REFERENCES `permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
