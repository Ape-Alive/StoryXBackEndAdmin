-- CreateTable
CREATE TABLE `backend_roles` (
    `id` VARCHAR(191) NOT NULL,
    `roleKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `backend_roles_roleKey_key`(`roleKey`),
    INDEX `backend_roles_status_idx`(`status`),
    INDEX `backend_roles_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backend_role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `backend_role_permissions_roleId_idx`(`roleId`),
    INDEX `backend_role_permissions_targetType_targetId_idx`(`targetType`, `targetId`),
    UNIQUE INDEX `backend_role_permissions_roleId_targetType_targetId_key`(`roleId`, `targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `backend_role_permissions` ADD CONSTRAINT `backend_role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `backend_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
