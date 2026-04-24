-- Add tags field for voice profiles (JSON array)
ALTER TABLE `voice_profiles`
  ADD COLUMN `tags` JSON NULL AFTER `meta`;

