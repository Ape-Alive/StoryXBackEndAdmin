-- Add avatarUrl to voice_profiles
ALTER TABLE `voice_profiles`
  ADD COLUMN `avatarUrl` VARCHAR(1024) NULL AFTER `sampleUrl`;

