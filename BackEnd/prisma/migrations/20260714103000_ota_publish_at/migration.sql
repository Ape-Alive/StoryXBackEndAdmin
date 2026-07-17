-- AlterTable
ALTER TABLE `ota_releases` ADD COLUMN `publishAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `ota_releases_publishAt_idx` ON `ota_releases`(`publishAt`);
