-- AlterTable: model_prices
ALTER TABLE `model_prices`
  ADD COLUMN `charPrice` DECIMAL(10, 6) NOT NULL DEFAULT 0,
  ADD COLUMN `maxChars` INT NULL;

-- AlterTable: user_api_keys
ALTER TABLE `user_api_keys`
  ADD COLUMN `voiceLimit` INT NOT NULL DEFAULT 0;

-- CreateTable: voice_profiles
CREATE TABLE `voice_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `voiceId` VARCHAR(191) NOT NULL,
  `scope` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `modelId` VARCHAR(191) NULL,
  `sampleUrl` VARCHAR(191) NULL,
  `name` VARCHAR(191) NULL,
  `description` VARCHAR(191) NULL,
  `meta` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `voice_profiles_voiceId_key`(`voiceId`),
  INDEX `voice_profiles_voiceId_idx`(`voiceId`),
  INDEX `voice_profiles_scope_idx`(`scope`),
  INDEX `voice_profiles_userId_idx`(`userId`),
  INDEX `voice_profiles_modelId_idx`(`modelId`),
  INDEX `voice_profiles_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `voice_profiles`
  ADD CONSTRAINT `voice_profiles_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `voice_profiles_modelId_fkey`
    FOREIGN KEY (`modelId`) REFERENCES `ai_models`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

