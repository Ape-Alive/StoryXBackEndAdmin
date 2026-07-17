-- CreateTable
CREATE TABLE `activation_codes` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'unused',
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `usedByUserId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NULL,
    `remark` VARCHAR(500) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `activation_codes_code_key`(`code`),
    INDEX `activation_codes_status_idx`(`status`),
    INDEX `activation_codes_expiresAt_idx`(`expiresAt`),
    INDEX `activation_codes_createdBy_idx`(`createdBy`),
    INDEX `activation_codes_packageId_idx`(`packageId`),
    INDEX `activation_codes_batchId_idx`(`batchId`),
    INDEX `activation_codes_deletedAt_idx`(`deletedAt`),
    INDEX `activation_codes_email_idx`(`email`),
    INDEX `activation_codes_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activation_codes` ADD CONSTRAINT `activation_codes_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activation_codes` ADD CONSTRAINT `activation_codes_usedByUserId_fkey` FOREIGN KEY (`usedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
