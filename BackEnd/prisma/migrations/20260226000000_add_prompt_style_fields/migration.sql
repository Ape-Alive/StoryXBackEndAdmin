-- AlterTable
ALTER TABLE `prompts` ADD COLUMN `isStylePrompt` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `prompts` ADD COLUMN `stylePromptKey` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `prompts_stylePromptKey_key` ON `prompts`(`stylePromptKey`);
