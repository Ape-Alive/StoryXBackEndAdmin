-- CreateTable
CREATE TABLE `client_roles` (
    `id` VARCHAR(191) NOT NULL,
    `roleKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_roles_roleKey_key`(`roleKey`),
    INDEX `client_roles_status_idx`(`status`),
    INDEX `client_roles_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_role_permissions_roleId_idx`(`roleId`),
    INDEX `client_role_permissions_targetType_targetId_idx`(`targetType`, `targetId`),
    UNIQUE INDEX `client_role_permissions_roleId_targetType_targetId_key`(`roleId`, `targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_role_permissions` ADD CONSTRAINT `client_role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `client_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
