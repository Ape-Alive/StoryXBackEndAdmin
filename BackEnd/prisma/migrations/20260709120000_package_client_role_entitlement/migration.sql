-- Package ↔ ClientRole binding and entitlement fields
ALTER TABLE `client_roles` ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 0;
CREATE INDEX `client_roles_priority_idx` ON `client_roles`(`priority`);

ALTER TABLE `packages` ADD COLUMN `clientRoleId` VARCHAR(191) NULL;
ALTER TABLE `packages` ADD COLUMN `isRecommend` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `packages` ADD COLUMN `guideScene` VARCHAR(191) NULL;
CREATE INDEX `packages_clientRoleId_idx` ON `packages`(`clientRoleId`);
ALTER TABLE `packages` ADD CONSTRAINT `packages_clientRoleId_fkey` FOREIGN KEY (`clientRoleId`) REFERENCES `client_roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
