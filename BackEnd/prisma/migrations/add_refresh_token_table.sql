-- 创建刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  userId VARCHAR(191) NOT NULL,
  deviceId VARCHAR(191) NULL COMMENT '设备ID（可选）',
  token VARCHAR(191) NOT NULL UNIQUE COMMENT '刷新令牌',
  accessToken VARCHAR(500) NULL COMMENT '当前关联的访问令牌（可选，用于追踪）',
  expiresAt DATETIME(3) NOT NULL COMMENT '过期时间',
  revoked BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已撤销',
  revokedAt DATETIME(3) NULL COMMENT '撤销时间',
  lastUsedAt DATETIME(3) NULL COMMENT '最后使用时间',
  ipAddress VARCHAR(191) NULL COMMENT '创建时的IP地址',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_refresh_tokens_userId (userId),
  INDEX idx_refresh_tokens_token (token),
  INDEX idx_refresh_tokens_deviceId (deviceId),
  INDEX idx_refresh_tokens_expiresAt (expiresAt),
  INDEX idx_refresh_tokens_revoked (revoked),

  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刷新令牌表（用于桌面端登录和Token刷新）';
