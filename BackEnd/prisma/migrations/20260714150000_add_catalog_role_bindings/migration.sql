-- Catalog role bindings (polymorphic) + clientRoleBindAll on catalog tables

CREATE TABLE `catalog_role_bindings` (
    `id` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalog_role_bindings_targetType_targetId_roleId_key`(`targetType`, `targetId`, `roleId`),
    INDEX `catalog_role_bindings_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `catalog_role_bindings_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `catalog_role_bindings` ADD CONSTRAINT `catalog_role_bindings_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `client_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ai_providers` ADD COLUMN `clientRoleBindAll` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `ai_models` ADD COLUMN `clientRoleBindAll` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `voice_profiles` ADD COLUMN `clientRoleBindAll` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `prompts` ADD COLUMN `clientRoleBindAll` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `style_library_items` ADD COLUMN `clientRoleBindAll` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `camera_movement_items` ADD COLUMN `clientRoleBindAll` BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows
UPDATE `ai_providers` SET `clientRoleBindAll` = true;
UPDATE `voice_profiles` SET `clientRoleBindAll` = true;
UPDATE `prompts` SET `clientRoleBindAll` = true;
UPDATE `style_library_items` SET `clientRoleBindAll` = true;
UPDATE `camera_movement_items` SET `clientRoleBindAll` = true;
UPDATE `ai_models` SET `clientRoleBindAll` = false;

-- Bind all existing models to package_paid_user when that role exists (no-op otherwise)
INSERT INTO `catalog_role_bindings` (`id`, `targetType`, `targetId`, `roleId`, `createdAt`)
SELECT
    CONCAT('crb_m_', REPLACE(m.`id`, '-', '')),
    'ai_model',
    m.`id`,
    r.`id`,
    CURRENT_TIMESTAMP(3)
FROM `ai_models` m
INNER JOIN `client_roles` r ON r.`roleKey` = 'package_paid_user' AND r.`status` = 'active';
