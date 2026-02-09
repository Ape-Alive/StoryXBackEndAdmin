-- 添加 maxToken 字段到 model_prices 表
ALTER TABLE `model_prices` ADD COLUMN `maxToken` INT NULL COMMENT '最大Token数（pricingType为token时使用），用于预估费用计算，null表示不限制' AFTER `callPrice`;

-- 添加索引（可选，如果需要按maxToken查询）
-- CREATE INDEX `idx_max_token` ON `model_prices` (`maxToken`);
