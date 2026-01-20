# Docker MySQL 密码说明

## 🔐 默认密码

在 `docker-compose.yml` 文件中配置的 MySQL 密码如下：

### Root 用户（超级管理员）
- **用户名**: `root`
- **密码**: `rootpassword`
- **用途**: 拥有所有数据库权限，用于管理操作

### 普通用户（可选）
- **用户名**: `storyx_user`
- **密码**: `storyx_password`
- **用途**: 应用程序专用的数据库用户（推荐生产环境使用）

## 📝 在 .env 文件中的使用

根据你选择的用户，在 `.env` 文件中配置：

### 使用 root 用户（开发环境）

```env
DATABASE_URL="mysql://root:rootpassword@localhost:3306/storyx_admin?schema=public"
```

### 使用普通用户（生产环境推荐）

```env
DATABASE_URL="mysql://storyx_user:storyx_password@localhost:3306/storyx_admin?schema=public"
```

## 🔒 修改密码

### 修改 docker-compose.yml 中的密码

1. 编辑 `docker-compose.yml` 文件
2. 修改 `MYSQL_ROOT_PASSWORD` 和/或 `MYSQL_PASSWORD` 的值
3. **重要**: 如果容器已经启动过，需要删除旧数据：

```bash
# 停止并删除容器和数据卷
docker-compose down -v

# 重新启动（会使用新密码）
docker-compose up -d
```

### 在运行的容器中修改密码

如果需要修改已运行容器的密码：

```bash
# 进入 MySQL 容器
docker exec -it storyx-mysql mysql -u root -prootpassword

# 在 MySQL 中执行
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
ALTER USER 'storyx_user'@'%' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# 然后更新 .env 文件中的密码
```

## 🛡️ 安全建议

### 开发环境
- 可以使用简单的密码（如 `rootpassword`）
- 仅在本地使用

### 生产环境
- ⚠️ **必须修改为强密码**
- 使用至少 16 个字符，包含大小写字母、数字和特殊字符
- 使用环境变量而不是明文密码（见下方）

## 🔐 使用环境变量（更安全）

可以通过环境变量设置密码，避免在 `docker-compose.yml` 中明文存储：

### 1. 创建 `.env` 文件用于 Docker Compose

创建 `.env.docker` 文件：

```env
MYSQL_ROOT_PASSWORD=your-strong-password-here
MYSQL_PASSWORD=your-app-password-here
```

### 2. 修改 docker-compose.yml

```yaml
services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-storyx_password}
```

### 3. 启动时使用环境变量

```bash
# 使用环境变量启动
docker-compose --env-file .env.docker up -d
```

## 📋 密码总结

| 用户类型 | 用户名 | 默认密码 | 权限 |
|---------|--------|---------|------|
| Root | `root` | `rootpassword` | 全部权限 |
| 普通用户 | `storyx_user` | `storyx_password` | 仅 storyx_admin 数据库权限 |

## ❓ 常见问题

### Q: 忘记密码怎么办？

A: 如果忘记了 root 密码，可以重置：

```bash
# 停止容器
docker-compose down

# 删除数据卷（⚠️ 会丢失所有数据）
docker-compose down -v

# 重新启动（使用新密码）
docker-compose up -d
```

### Q: 如何在多个环境中使用不同密码？

A: 为不同环境创建不同的 docker-compose 文件：

- `docker-compose.dev.yml` - 开发环境
- `docker-compose.prod.yml` - 生产环境

使用 `-f` 参数指定文件：
```bash
docker-compose -f docker-compose.prod.yml up -d
```

