-- 修复 token 字段长度，支持 JWT token（767字符足够，且满足MySQL唯一索引限制）
-- MySQL 使用 utf8mb4 字符集时，每个字符最多4字节，767字符 × 4字节 = 3068字节 < 3072字节限制

-- 修改 one_time_tokens 表的 token 字段为 VARCHAR(767)
ALTER TABLE `one_time_tokens`
  MODIFY COLUMN `token` VARCHAR(767) NOT NULL;

-- 修改 refresh_tokens 表的 token 字段为 VARCHAR(767)
ALTER TABLE `refresh_tokens`
  MODIFY COLUMN `token` VARCHAR(767) NOT NULL;

-- 修改 refresh_tokens 表的 accessToken 字段为 VARCHAR(767)（如果存在）
ALTER TABLE `refresh_tokens`
  MODIFY COLUMN `accessToken` VARCHAR(767) NULL;
