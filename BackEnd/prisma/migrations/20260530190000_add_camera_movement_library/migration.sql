-- CreateTable
CREATE TABLE `camera_movement_items` (
    `id` VARCHAR(191) NOT NULL,
    `movementKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tagLabel` VARCHAR(191) NULL,
    `prompt` TEXT NOT NULL,
    `previewUrl` TEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'custom',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `camera_movement_items_movementKey_key`(`movementKey`),
    INDEX `camera_movement_items_type_idx`(`type`),
    INDEX `camera_movement_items_isActive_idx`(`isActive`),
    INDEX `camera_movement_items_sortOrder_idx`(`sortOrder`),
    INDEX `camera_movement_items_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 官方运镜种子数据请执行：npm run seed:camera-movements
-- 勿在 migration.sql 中直接 INSERT 中文，docker mysql 管道导入易出现 UTF-8 双重编码乱码
