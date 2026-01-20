-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_username_key`(`username`),
    UNIQUE INDEX `admins_email_key`(`email`),
    INDEX `admins_username_idx`(`username`),
    INDEX `admins_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `email_verifications_email_idx`(`email`),
    INDEX `email_verifications_code_idx`(`code`),
    INDEX `email_verifications_type_idx`(`type`),
    INDEX `email_verifications_used_idx`(`used`),
    INDEX `email_verifications_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `banReason` VARCHAR(191) NULL,
    `banUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_phone_idx`(`phone`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceFingerprint` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `devices_userId_idx`(`userId`),
    INDEX `devices_deviceFingerprint_idx`(`deviceFingerprint`),
    UNIQUE INDEX `devices_userId_deviceFingerprint_key`(`userId`, `deviceFingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_providers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `baseUrl` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_providers_name_key`(`name`),
    INDEX `ai_providers_name_idx`(`name`),
    INDEX `ai_providers_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_models` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `baseUrl` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `requiresKey` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_models_providerId_idx`(`providerId`),
    INDEX `ai_models_type_idx`(`type`),
    INDEX `ai_models_category_idx`(`category`),
    INDEX `ai_models_isActive_idx`(`isActive`),
    UNIQUE INDEX `ai_models_providerId_name_key`(`providerId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_prices` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NULL,
    `inputPrice` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `outputPrice` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `callPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `effectiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `model_prices_modelId_idx`(`modelId`),
    INDEX `model_prices_packageId_idx`(`packageId`),
    INDEX `model_prices_effectiveAt_idx`(`effectiveAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `duration` INTEGER NULL,
    `totalQuota` DECIMAL(20, 2) NULL,
    `totalCalls` INTEGER NULL,
    `availableModels` VARCHAR(191) NULL,
    `isStackable` BOOLEAN NOT NULL DEFAULT false,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `packages_name_idx`(`name`),
    INDEX `packages_type_idx`(`type`),
    INDEX `packages_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_packages` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_packages_userId_idx`(`userId`),
    INDEX `user_packages_packageId_idx`(`packageId`),
    INDEX `user_packages_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `user_packages_userId_packageId_key`(`userId`, `packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_quotas` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NULL,
    `available` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `frozen` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `used` DECIMAL(20, 2) NOT NULL DEFAULT 0,
    `availableCalls` INTEGER NOT NULL DEFAULT 0,
    `usedCalls` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_quotas_userId_idx`(`userId`),
    INDEX `user_quotas_packageId_idx`(`packageId`),
    UNIQUE INDEX `user_quotas_userId_packageId_key`(`userId`, `packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quota_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 2) NOT NULL,
    `calls` INTEGER NOT NULL DEFAULT 0,
    `before` DECIMAL(20, 2) NOT NULL,
    `after` DECIMAL(20, 2) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `quota_records_userId_idx`(`userId`),
    INDEX `quota_records_packageId_idx`(`packageId`),
    INDEX `quota_records_type_idx`(`type`),
    INDEX `quota_records_requestId_idx`(`requestId`),
    INDEX `quota_records_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompt_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prompt_categories_name_key`(`name`),
    INDEX `prompt_categories_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompts` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `tags` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prompts_categoryId_idx`(`categoryId`),
    INDEX `prompts_type_idx`(`type`),
    INDEX `prompts_userId_idx`(`userId`),
    INDEX `prompts_isActive_idx`(`isActive`),
    INDEX `prompts_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompt_versions` (
    `id` VARCHAR(191) NOT NULL,
    `promptId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prompt_versions_promptId_idx`(`promptId`),
    INDEX `prompt_versions_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `prompt_versions_promptId_version_key`(`promptId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorizations` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `deviceFingerprint` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `frozenQuota` DECIMAL(20, 2) NOT NULL,
    `sessionToken` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `expiresAt` DATETIME(3) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `authorizations_sessionToken_key`(`sessionToken`),
    INDEX `authorizations_userId_idx`(`userId`),
    INDEX `authorizations_modelId_idx`(`modelId`),
    INDEX `authorizations_sessionToken_idx`(`sessionToken`),
    INDEX `authorizations_status_idx`(`status`),
    INDEX `authorizations_expiresAt_idx`(`expiresAt`),
    INDEX `authorizations_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_logs` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `result` VARCHAR(191) NOT NULL DEFAULT 'success',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `operation_logs_adminId_idx`(`adminId`),
    INDEX `operation_logs_action_idx`(`action`),
    INDEX `operation_logs_targetType_idx`(`targetType`),
    INDEX `operation_logs_targetId_idx`(`targetId`),
    INDEX `operation_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_call_logs` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` INTEGER NOT NULL DEFAULT 0,
    `cost` DECIMAL(10, 4) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `errorMessage` TEXT NULL,
    `requestTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responseTime` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `deviceFingerprint` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,

    UNIQUE INDEX `ai_call_logs_requestId_key`(`requestId`),
    INDEX `ai_call_logs_userId_idx`(`userId`),
    INDEX `ai_call_logs_modelId_idx`(`modelId`),
    INDEX `ai_call_logs_status_idx`(`status`),
    INDEX `ai_call_logs_requestTime_idx`(`requestTime`),
    INDEX `ai_call_logs_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_rules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `conditions` TEXT NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actionParams` TEXT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `risk_rules_name_key`(`name`),
    INDEX `risk_rules_isActive_idx`(`isActive`),
    INDEX `risk_rules_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_triggers` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `modelId` VARCHAR(191) NULL,
    `conditions` TEXT NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actionResult` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `risk_triggers_ruleId_idx`(`ruleId`),
    INDEX `risk_triggers_userId_idx`(`userId`),
    INDEX `risk_triggers_modelId_idx`(`modelId`),
    INDEX `risk_triggers_status_idx`(`status`),
    INDEX `risk_triggers_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_models` ADD CONSTRAINT `ai_models_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `model_prices` ADD CONSTRAINT `model_prices_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_packages` ADD CONSTRAINT `user_packages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_packages` ADD CONSTRAINT `user_packages_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_quotas` ADD CONSTRAINT `user_quotas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quota_records` ADD CONSTRAINT `quota_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quota_records` ADD CONSTRAINT `quota_records_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prompts` ADD CONSTRAINT `prompts_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `prompt_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prompt_versions` ADD CONSTRAINT `prompt_versions_promptId_fkey` FOREIGN KEY (`promptId`) REFERENCES `prompts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorizations` ADD CONSTRAINT `authorizations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorizations` ADD CONSTRAINT `authorizations_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_logs` ADD CONSTRAINT `operation_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_call_logs` ADD CONSTRAINT `ai_call_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_call_logs` ADD CONSTRAINT `ai_call_logs_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
