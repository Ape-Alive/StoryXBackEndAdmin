-- AlterTable
ALTER TABLE `packages` ADD COLUMN `maxDevices` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'basic_user';

-- CreateIndex
CREATE INDEX `users_role_idx` ON `users`(`role`);
