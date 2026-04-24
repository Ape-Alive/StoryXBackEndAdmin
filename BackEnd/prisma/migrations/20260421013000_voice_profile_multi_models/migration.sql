-- CreateTable: voice_profile_models
CREATE TABLE IF NOT EXISTS `voice_profile_models` (
  `voiceProfileId` VARCHAR(191) NOT NULL,
  `modelId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`voiceProfileId`, `modelId`),
  INDEX `voice_profile_models_voiceProfileId_idx` (`voiceProfileId`),
  INDEX `voice_profile_models_modelId_idx` (`modelId`),
  CONSTRAINT `voice_profile_models_voiceProfileId_fkey` FOREIGN KEY (`voiceProfileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `voice_profile_models_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Data migration: move existing voice_profiles.modelId to join table (if column still exists)
INSERT IGNORE INTO `voice_profile_models` (`voiceProfileId`, `modelId`)
SELECT `id` AS `voiceProfileId`, `modelId`
FROM `voice_profiles`
WHERE `modelId` IS NOT NULL;

-- DropColumn: modelId (if exists)
ALTER TABLE `voice_profiles` DROP COLUMN `modelId`;

