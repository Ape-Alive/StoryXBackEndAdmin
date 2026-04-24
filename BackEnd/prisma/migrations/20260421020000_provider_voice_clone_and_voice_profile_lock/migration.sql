-- AlterTable: ai_providers
ALTER TABLE `ai_providers`
  ADD COLUMN `voiceCloneApis` TEXT NULL;

-- AlterTable: voice_profiles
ALTER TABLE `voice_profiles`
  ADD COLUMN `isModelLocked` BOOLEAN NOT NULL DEFAULT false;

