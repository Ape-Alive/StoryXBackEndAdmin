-- 添加提供商额度相关字段
ALTER TABLE `ai_providers`
ADD COLUMN `quota` DECIMAL(20, 2) NULL COMMENT '额度',
ADD COLUMN `quotaUnit` VARCHAR(191) NULL COMMENT '额度单位：points(积分)、yuan(元)、usd(美元)',
ADD COLUMN `mainAccountToken` TEXT NULL COMMENT '主账户token';

-- 添加索引
CREATE INDEX `ai_providers_quotaUnit_idx` ON `ai_providers`(`quotaUnit`);

