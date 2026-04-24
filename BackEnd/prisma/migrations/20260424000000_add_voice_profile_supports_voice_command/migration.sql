-- Add supportsVoiceCommand flag for voice profiles
ALTER TABLE `voice_profiles`
  ADD COLUMN `supportsVoiceCommand` BOOLEAN NOT NULL DEFAULT FALSE AFTER `meta`;

