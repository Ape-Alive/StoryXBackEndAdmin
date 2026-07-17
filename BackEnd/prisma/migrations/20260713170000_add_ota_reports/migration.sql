-- CreateTable
CREATE TABLE `ota_reports` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `layer` VARCHAR(191) NULL,
    `fromBuild` INTEGER NULL,
    `toBuild` INTEGER NULL,
    `platform` VARCHAR(191) NULL,
    `channel` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ota_reports_deviceId_idx`(`deviceId`),
    INDEX `ota_reports_event_idx`(`event`),
    INDEX `ota_reports_layer_idx`(`layer`),
    INDEX `ota_reports_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
