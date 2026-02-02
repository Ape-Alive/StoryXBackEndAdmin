-- Add functionKey field to prompts table
-- Note: This migration requires manual data migration for existing records
-- You may need to generate functionKey values for existing prompts before running this migration

ALTER TABLE `prompts` ADD COLUMN `functionKey` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `prompts_functionKey_key` ON `prompts`(`functionKey`);
CREATE INDEX `prompts_functionKey_idx` ON `prompts`(`functionKey`);

-- After adding the column, you need to update existing records with unique functionKey values
-- Example: UPDATE prompts SET functionKey = CONCAT('prompt_', id) WHERE functionKey IS NULL;
-- Then make it NOT NULL:
-- ALTER TABLE `prompts` MODIFY COLUMN `functionKey` VARCHAR(191) NOT NULL;
