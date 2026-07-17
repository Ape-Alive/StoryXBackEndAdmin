-- CreateTable
CREATE TABLE `style_library_system_prompts` (
    `styleLibraryItemId` VARCHAR(191) NOT NULL,
    `systemPromptId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `style_library_system_prompts_styleLibraryItemId_idx`(`styleLibraryItemId`),
    INDEX `style_library_system_prompts_systemPromptId_idx`(`systemPromptId`),
    PRIMARY KEY (`styleLibraryItemId`, `systemPromptId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing single associations
INSERT INTO `style_library_system_prompts` (`styleLibraryItemId`, `systemPromptId`, `createdAt`)
SELECT `id`, `systemPromptId`, NOW(3)
FROM `style_library_items`
WHERE `systemPromptId` IS NOT NULL AND `systemPromptId` != '';

-- DropForeignKey
ALTER TABLE `style_library_items` DROP FOREIGN KEY `style_library_items_systemPromptId_fkey`;

-- DropIndex
DROP INDEX `style_library_items_systemPromptId_idx` ON `style_library_items`;

-- AlterTable
ALTER TABLE `style_library_items` DROP COLUMN `systemPromptId`;

-- AddForeignKey
ALTER TABLE `style_library_system_prompts` ADD CONSTRAINT `style_library_system_prompts_styleLibraryItemId_fkey` FOREIGN KEY (`styleLibraryItemId`) REFERENCES `style_library_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `style_library_system_prompts` ADD CONSTRAINT `style_library_system_prompts_systemPromptId_fkey` FOREIGN KEY (`systemPromptId`) REFERENCES `prompts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
