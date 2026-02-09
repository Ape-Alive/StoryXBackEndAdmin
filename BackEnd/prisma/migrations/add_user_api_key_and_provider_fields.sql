-- 添加 AIProvider 新字段
ALTER TABLE `ai_providers` 
ADD COLUMN `supportsApiKeyCreation` BOOLEAN DEFAULT FALSE COMMENT '是否支持通过接口创建API Key' AFTER `mainAccountToken`,
ADD COLUMN `apiKeyCreationConfig` TEXT NULL COMMENT 'API Key创建接口配置（JSON字符串）' AFTER `supportsApiKeyCreation`,
ADD COLUMN `apiKeys` TEXT NULL COMMENT '系统创建的API Key ID列表（JSON数组）' AFTER `apiKeyCreationConfig`;

-- 创建 user_api_keys 表
CREATE TABLE `user_api_keys` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `providerId` VARCHAR(191) NOT NULL,
  `apiKey` TEXT NOT NULL COMMENT 'API密钥（加密存储）',
  `apiKeyId` VARCHAR(191) NULL COMMENT '第三方返回的ID',
  `name` VARCHAR(255) NOT NULL COMMENT 'API Key名称',
  `type` VARCHAR(50) NOT NULL COMMENT 'system_created（系统创建）, user_created（用户创建）',
  `credits` DECIMAL(20, 2) DEFAULT 0 COMMENT '积分额度（固定为0表示无限制，仅用于记录）',
  `expireTime` BIGINT DEFAULT 0 COMMENT '到期时间（时间戳，0表示永不过期）',
  `status` VARCHAR(50) DEFAULT 'active' COMMENT 'active, expired, revoked',
  `packageId` VARCHAR(191) NULL COMMENT '关联的套餐ID（可选）',
  `createdBy` VARCHAR(191) NULL COMMENT '创建者ID（管理员ID或用户ID）',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `user_api_keys_userId_idx` (`userId`),
  INDEX `user_api_keys_providerId_idx` (`providerId`),
  INDEX `user_api_keys_status_idx` (`status`),
  INDEX `user_api_keys_type_idx` (`type`),
  INDEX `user_api_keys_expireTime_idx` (`expireTime`),
  INDEX `user_api_keys_packageId_idx` (`packageId`),
  CONSTRAINT `user_api_keys_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_api_keys_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户API Key表';

-- 添加 User 表的关联（已在 schema 中定义，这里只是说明）
-- User 表的 apiKeys 关联会自动通过外键建立
