# 数据库迁移（导出/导入）操作说明

本文用于把当前本机 MySQL（Docker 容器 `storyx-mysql`）里的 `storyx_admin` 数据库完整迁移到另一台机器。

## 一、在当前机器导出并压缩

前置条件：

- Docker Desktop 已启动
- MySQL 容器名为 `storyx-mysql`
- root 密码为 `rootpassword`
- 目标库名为 `storyx_admin`

在项目后端目录执行：

```bash
cd /Users/liuqihui/lqh/mycode/StoryXBackEndAdmin/BackEnd

# 导出并压缩（生成 storyx_admin_dump.sql.gz）
docker exec -i storyx-mysql mysqldump \
  -uroot -prootpassword \
  --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF \
  storyx_admin > storyx_admin_dump.sql

gzip -9 storyx_admin_dump.sql
ls -lh storyx_admin_dump.sql.gz
```

产物文件：

- `BackEnd/storyx_admin_dump.sql.gz`

## 二、把压缩包拷贝到另一台机器

任选一种方式拷贝：

- U 盘/网盘
- `scp`
- 其他文件传输工具

示例（scp）：

```bash
scp storyx_admin_dump.sql.gz user@remote:/path/to/BackEnd/
```

## 三、在另一台机器导入

1. 先启动另一台机器上的 MySQL 容器（确保可 `docker exec`）

```bash
cd /path/to/StoryXBackEndAdmin/BackEnd
docker compose up -d mysql
```

2. 确保数据库存在（没有就创建）

```bash
docker exec -i storyx-mysql mysql -uroot -prootpassword -e \
  "CREATE DATABASE IF NOT EXISTS storyx_admin DEFAULT CHARACTER SET utf8mb4;"
```

3. 解压并导入

```bash
gunzip -c storyx_admin_dump.sql.gz | docker exec -i storyx-mysql mysql -uroot -prootpassword storyx_admin
```

4. 校验导入结果（示例）

```bash
docker exec -i storyx-mysql mysql -uroot -prootpassword -e "USE storyx_admin; SHOW TABLES;"
```

## 四、在本机直接把 `storyx_admin_dump.sql.gz` 导入当前 Docker 数据库

适用场景：

- 你已经在本机 `BackEnd/` 目录有 `storyx_admin_dump.sql.gz`
- 你要导入到当前正在运行的 Docker MySQL（容器名 `storyx-mysql`）

### 1) 确保 MySQL 容器已启动、数据库存在

```bash
cd BackEnd
docker compose up -d mysql

docker exec -i storyx-mysql mysql -uroot -prootpassword -e \
  "CREATE DATABASE IF NOT EXISTS storyx_admin DEFAULT CHARACTER SET utf8mb4;"
```

### 2) 解压并导入

```bash
cd BackEnd
gunzip -c storyx_admin_dump.sql.gz | docker exec -i storyx-mysql mysql -uroot -prootpassword storyx_admin
```

### 3) 校验（示例）

```bash
docker exec -i storyx-mysql mysql -uroot -prootpassword -e \
  "SELECT 'admins' t, COUNT(*) c FROM storyx_admin.admins UNION SELECT 'users', COUNT(*) FROM storyx_admin.users;"
```

### 4) 需要“覆盖式导入”（避免重复数据）时

强烈建议在导入前先清空目标库（会删除所有表和数据）：

```bash
docker exec -i storyx-mysql mysql -uroot -prootpassword -e \
  "DROP DATABASE IF EXISTS storyx_admin; CREATE DATABASE storyx_admin DEFAULT CHARACTER SET utf8mb4;"

gunzip -c storyx_admin_dump.sql.gz | docker exec -i storyx-mysql mysql -uroot -prootpassword storyx_admin
```

## 注意事项

- **不要把 dump 文件提交到 git**：`storyx_admin_dump.sql.gz` 属于真实数据库数据，建议仅线下传输，不要上传到远程仓库。
- 如果另一台机器的 MySQL root 密码/容器名不同，请相应替换命令中的 `storyx-mysql`、`rootpassword`。
- 导入到已有数据的库会产生冲突/重复数据风险；如需“覆盖式迁移”，请先清空目标库或导入到新库名后再切换。
