-- CreateTable
CREATE TABLE `backend_menus` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `i18nNames` JSON NOT NULL,
    `path` VARCHAR(191) NULL,
    `frontendPermissionCode` VARCHAR(191) NULL,
    `backendPermissionCode` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NOT NULL DEFAULT '0',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `backend_menus_parentId_idx`(`parentId`),
    INDEX `backend_menus_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backend_menu_buttons` (
    `id` VARCHAR(191) NOT NULL,
    `menuId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `i18nNames` JSON NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `isDisabled` BOOLEAN NOT NULL DEFAULT false,
    `frontendPermissionCode` VARCHAR(191) NULL,
    `backendPermissionCode` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `backend_menu_buttons_menuId_idx`(`menuId`),
    INDEX `backend_menu_buttons_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_menus` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `i18nNames` JSON NOT NULL,
    `path` VARCHAR(191) NULL,
    `frontendPermissionCode` VARCHAR(191) NULL,
    `backendPermissionCode` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NOT NULL DEFAULT '0',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `client_menus_parentId_idx`(`parentId`),
    INDEX `client_menus_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_menu_buttons` (
    `id` VARCHAR(191) NOT NULL,
    `menuId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `i18nNames` JSON NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `isDisabled` BOOLEAN NOT NULL DEFAULT false,
    `frontendPermissionCode` VARCHAR(191) NULL,
    `backendPermissionCode` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `client_menu_buttons_menuId_idx`(`menuId`),
    INDEX `client_menu_buttons_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `backend_menu_buttons` ADD CONSTRAINT `backend_menu_buttons_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `backend_menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_menu_buttons` ADD CONSTRAINT `client_menu_buttons_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `client_menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
