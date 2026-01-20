-- Add role column to users table
ALTER TABLE `users`
ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'basic_user';

-- Add index for role column
CREATE INDEX `users_role_idx` ON `users`(`role`);

-- Add maxDevices column to packages table
ALTER TABLE `packages`
ADD COLUMN `maxDevices` INTEGER NULL;

