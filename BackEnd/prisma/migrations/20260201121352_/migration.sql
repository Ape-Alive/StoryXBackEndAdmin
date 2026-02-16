/*
  Warnings:

  - You are about to drop the column `totalCalls` on the `packages` table. All the data in the column will be lost.
  - You are about to drop the column `calls` on the `quota_records` table. All the data in the column will be lost.
  - You are about to drop the column `availableCalls` on the `user_quotas` table. All the data in the column will be lost.
  - You are about to drop the column `usedCalls` on the `user_quotas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ai_models` ADD COLUMN `apiConfig` TEXT NULL;

-- AlterTable
ALTER TABLE `ai_providers` ADD COLUMN `mainAccountToken` VARCHAR(191) NULL,
    ADD COLUMN `quota` DECIMAL(20, 2) NULL,
    ADD COLUMN `quotaUnit` VARCHAR(191) NULL DEFAULT 'points';

-- AlterTable
ALTER TABLE `devices` ADD COLUMN `name` VARCHAR(191) NULL,
    ADD COLUMN `remark` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `model_prices` ADD COLUMN `pricingType` VARCHAR(191) NOT NULL DEFAULT 'token';

-- AlterTable
ALTER TABLE `packages` DROP COLUMN `totalCalls`,
    ADD COLUMN `discount` DECIMAL(5, 2) NULL,
    ADD COLUMN `price` DECIMAL(20, 2) NULL,
    ADD COLUMN `priceUnit` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `quota_records` DROP COLUMN `calls`,
    ADD COLUMN `orderId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user_quotas` DROP COLUMN `availableCalls`,
    DROP COLUMN `usedCalls`;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `amount` DECIMAL(20, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'CNY',
    `discount` DECIMAL(5, 2) NULL,
    `finalAmount` DECIMAL(20, 2) NOT NULL,
    `description` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_orderNo_key`(`orderNo`),
    INDEX `orders_userId_idx`(`userId`),
    INDEX `orders_orderNo_idx`(`orderNo`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `paymentNo` VARCHAR(191) NOT NULL,
    `thirdPartyNo` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentPlatform` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'CNY',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `qrCodeUrl` VARCHAR(191) NULL,
    `payUrl` VARCHAR(191) NULL,
    `callbackData` TEXT NULL,
    `notifyUrl` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `failureReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_paymentNo_key`(`paymentNo`),
    INDEX `payments_orderId_idx`(`orderId`),
    INDEX `payments_paymentNo_idx`(`paymentNo`),
    INDEX `payments_thirdPartyNo_idx`(`thirdPartyNo`),
    INDEX `payments_status_idx`(`status`),
    INDEX `payments_paymentPlatform_idx`(`paymentPlatform`),
    INDEX `payments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ai_providers_quotaUnit_idx` ON `ai_providers`(`quotaUnit`);

-- CreateIndex
CREATE INDEX `devices_status_idx` ON `devices`(`status`);

-- CreateIndex
CREATE INDEX `model_prices_pricingType_idx` ON `model_prices`(`pricingType`);

-- CreateIndex
CREATE INDEX `quota_records_orderId_idx` ON `quota_records`(`orderId`);

-- AddForeignKey
ALTER TABLE `quota_records` ADD CONSTRAINT `quota_records_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
