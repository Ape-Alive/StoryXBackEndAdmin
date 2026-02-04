-- 添加 durationUnit 字段到 packages 表
ALTER TABLE packages ADD COLUMN durationUnit VARCHAR(10) NULL COMMENT '有效期单位：day（天）、month（月）、year（年），null表示永久';

-- 为现有数据设置默认值（如果 duration 不为 null，默认为 day）
UPDATE packages SET durationUnit = 'day' WHERE duration IS NOT NULL AND durationUnit IS NULL;
