-- 创建一次性令牌表
CREATE TABLE IF NOT EXISTS one_time_tokens (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  userId VARCHAR(191) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE COMMENT '一次性token',
  used BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已使用',
  usedAt DATETIME(3) NULL COMMENT '使用时间',
  expiresAt DATETIME(3) NOT NULL COMMENT '过期时间（通常5-10分钟）',
  ipAddress VARCHAR(191) NULL COMMENT '创建时的IP地址',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_one_time_tokens_userId (userId),
  INDEX idx_one_time_tokens_token (token),
  INDEX idx_one_time_tokens_used (used),
  INDEX idx_one_time_tokens_expiresAt (expiresAt),

  CONSTRAINT fk_one_time_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='一次性令牌表（用于桌面端登录）';
