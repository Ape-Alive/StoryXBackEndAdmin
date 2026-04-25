-- AIProvider: 单次音色复刻扣费积分（0=不扣）
ALTER TABLE `ai_providers`
ADD COLUMN `voiceCloneCreditsPerCall` DECIMAL(20, 2) NOT NULL DEFAULT 0.00;

-- 音色复刻扣费流水（列名与 Prisma 默认 camelCase 一致）
CREATE TABLE `voice_clone_credit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `userApiKeyId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `voiceProfileId` VARCHAR(191) NULL,
    `voiceId` VARCHAR(191) NULL,
    `amountCharged` DECIMAL(20, 2) NOT NULL,
    `keyCreditsCap` DECIMAL(20, 2) NOT NULL,
    `usedCreditsBefore` DECIMAL(20, 2) NOT NULL,
    `usedCreditsAfter` DECIMAL(20, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `meta` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `voice_clone_credit_logs_userApiKeyId_idx` ON `voice_clone_credit_logs`(`userApiKeyId`);
CREATE INDEX `voice_clone_credit_logs_providerId_idx` ON `voice_clone_credit_logs`(`providerId`);
CREATE INDEX `voice_clone_credit_logs_actorUserId_idx` ON `voice_clone_credit_logs`(`actorUserId`);
CREATE INDEX `voice_clone_credit_logs_voiceProfileId_idx` ON `voice_clone_credit_logs`(`voiceProfileId`);
CREATE INDEX `voice_clone_credit_logs_createdAt_idx` ON `voice_clone_credit_logs`(`createdAt`);

ALTER TABLE `voice_clone_credit_logs` ADD CONSTRAINT `voice_clone_credit_logs_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `voice_clone_credit_logs` ADD CONSTRAINT `voice_clone_credit_logs_userApiKeyId_fkey` FOREIGN KEY (`userApiKeyId`) REFERENCES `user_api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `voice_clone_credit_logs` ADD CONSTRAINT `voice_clone_credit_logs_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `voice_clone_credit_logs` ADD CONSTRAINT `voice_clone_credit_logs_voiceProfileId_fkey` FOREIGN KEY (`voiceProfileId`) REFERENCES `voice_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
