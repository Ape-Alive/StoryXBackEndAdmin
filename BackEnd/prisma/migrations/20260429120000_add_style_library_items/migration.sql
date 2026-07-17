-- CreateTable
CREATE TABLE `style_library_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NULL,
    `coverUrl` VARCHAR(191) NULL,
    `mediaType` VARCHAR(191) NOT NULL,
    `systemPromptId` VARCHAR(191) NOT NULL,
    `stylePromptKey` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `recommendScore` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `style_library_items_mediaType_idx`(`mediaType`),
    INDEX `style_library_items_systemPromptId_idx`(`systemPromptId`),
    INDEX `style_library_items_isActive_idx`(`isActive`),
    INDEX `style_library_items_isFeatured_idx`(`isFeatured`),
    INDEX `style_library_items_recommendScore_idx`(`recommendScore`),
    INDEX `style_library_items_sortOrder_idx`(`sortOrder`),
    INDEX `style_library_items_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `style_library_items` ADD CONSTRAINT `style_library_items_systemPromptId_fkey` FOREIGN KEY (`systemPromptId`) REFERENCES `prompts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
