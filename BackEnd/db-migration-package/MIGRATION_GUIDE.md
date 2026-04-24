# StoryX BackEnd 数据库迁移说明

本包用于将本地 MySQL 数据库迁移到另一台设备（可通过 U 盘拷贝）。

## 包内文件

- `storyx_admin-20260424-182138.sql`：数据库完整导出文件（结构 + 数据）
- `storyx_admin-20260424-182138.sql.sha256`：SQL 文件校验和
- `import-on-target.sh`：目标机器一键导入脚本
- `MIGRATION_GUIDE.md`：本说明

## 迁移前准备（目标机器）

1. 安装并启动 MySQL 8.x（或与你源库兼容的版本）
2. 确认目标机器有该项目代码（至少有 `BackEnd/prisma/schema.prisma`）
3. 将整个 `db-migration-package` 目录拷贝到目标机器，例如：`~/db-migration-package`

## 步骤 1：校验 SQL 文件完整性（建议）

在目标机器进入迁移目录：

```bash
cd ~/db-migration-package
shasum -a 256 -c storyx_admin-20260424-182138.sql.sha256
```

输出 `OK` 说明文件未损坏。

## 步骤 2：导入数据库（推荐脚本）

```bash
cd ~/db-migration-package
chmod +x import-on-target.sh
./import-on-target.sh
```

脚本默认使用以下连接信息：

- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: `rootpassword`
- DB: `storyx_admin`

如需自定义，可在执行前通过环境变量覆盖：

```bash
MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD='your_pass' MYSQL_DB=storyx_admin ./import-on-target.sh
```

## 步骤 3：项目侧同步（目标机器）

进入后端目录执行：

```bash
cd BackEnd
npx prisma generate
```

然后重启后端服务。

## 常见问题

1. `Unknown collation`：两台机器 MySQL 版本差异过大，建议统一到 MySQL 8.x。
2. `Access denied`：检查 `MYSQL_USER` / `MYSQL_PASSWORD` 权限。
3. 导入后接口报 Prisma 字段不存在：通常是未重新 `prisma generate` 或服务未重启。

