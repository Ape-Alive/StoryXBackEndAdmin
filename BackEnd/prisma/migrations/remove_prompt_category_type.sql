-- Remove type field and index from prompt_categories table
ALTER TABLE `prompt_categories` DROP INDEX IF EXISTS `prompt_categories_type_idx`;
ALTER TABLE `prompt_categories` DROP COLUMN `type`;
