-- AlterTable: user_api_keys
ALTER TABLE `user_api_keys`
  ADD COLUMN `usedCredits` DECIMAL(20, 2) NOT NULL DEFAULT 0;

-- AlterTable: authorizations
ALTER TABLE `authorizations`
  ADD COLUMN `userApiKeyId` VARCHAR(191) NULL;

CREATE INDEX `authorizations_userApiKeyId_idx` ON `authorizations`(`userApiKeyId`);

ALTER TABLE `authorizations`
  ADD CONSTRAINT `authorizations_userApiKeyId_fkey`
    FOREIGN KEY (`userApiKeyId`) REFERENCES `user_api_keys`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

