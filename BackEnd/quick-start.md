# 快速开始指南

## 🚀 快速启动 MySQL（使用 Docker - 推荐）

如果你没有安装 MySQL，最简单的方法是使用 Docker。

⚠️ **前提条件**：需要先安装 Docker Desktop（见下方安装步骤）

### 安装 Docker（如果未安装）

**macOS 用户：**
```bash
# 使用 Homebrew 安装 Docker Desktop
brew install --cask docker

# 启动 Docker Desktop
open -a Docker

# 等待 Docker 启动完成，然后验证
docker --version
docker compose version
```

**详细安装步骤请查看：`docker-setup.md`**

### 1. 启动 MySQL 容器

```bash
cd BackEnd

# 启动 MySQL（首次运行会自动下载镜像）
# 注意：新版本 Docker Desktop 使用 "docker compose"（无连字符）
# 旧版本或独立安装使用 "docker-compose"（有连字符）
docker compose up -d

# 如果上面的命令不行，尝试：
# docker-compose up -d

# 查看容器状态
docker compose ps
# 或：docker-compose ps

# 查看日志
docker compose logs -f mysql
# 或：docker-compose logs -f mysql
```

### 2. 更新数据库配置

编辑 `.env` 文件，使用 Docker MySQL 的配置：

**默认密码说明：**
- **root 用户密码**: `rootpassword` （在 docker-compose.yml 中设置）
- **普通用户密码**: `storyx_password` （在 docker-compose.yml 中设置）

```env
# 方式一：使用 root 用户（推荐开发环境）
DATABASE_URL="mysql://root:rootpassword@localhost:3306/storyx_admin?schema=public"

# 方式二：使用专用用户（推荐生产环境）
DATABASE_URL="mysql://storyx_user:storyx_password@localhost:3306/storyx_admin?schema=public"
```

⚠️ **注意**:
- 如果已经启动过 MySQL 容器，修改 `docker-compose.yml` 中的密码不会生效
- 需要删除旧的容器和数据卷：`docker-compose down -v`，然后重新启动

### 3. 运行数据库迁移

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 创建数据库表结构
npm run prisma:migrate

# 初始化种子数据（创建默认管理员）
npm run prisma:seed
```

### 4. 启动项目

```bash
npm run dev
```

### 5. 访问 API 文档

打开浏览器访问：
- Swagger UI: http://localhost:3000/api-docs
- API JSON: http://localhost:3000/api-docs.json

### 6. 默认管理员账号

通过 seed 创建的默认管理员：
- 用户名: `admin`
- 密码: `admin123456`

⚠️ **重要：生产环境请务必修改默认密码！**

## 🛠️ 使用本地 MySQL

如果你已经安装了 MySQL：

### 1. 启动 MySQL 服务

```bash
# macOS (Homebrew)
brew services start mysql

# 或手动启动
mysql.server start
```

### 2. 创建数据库

```bash
mysql -u root -p

# 在 MySQL 中执行
CREATE DATABASE storyx_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. 更新 .env 配置

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/storyx_admin?schema=public"
```

### 4. 运行迁移和种子

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 📝 常用命令

```bash
# 启动开发服务器
npm run dev

# 查看数据库（Prisma Studio）
npm run prisma:studio

# 创建新的迁移
npm run prisma:migrate

# 重置数据库（⚠️ 会删除所有数据）
npm run prisma:migrate reset

# 停止 Docker MySQL
docker compose down
# 或：docker-compose down

# 停止并删除数据（⚠️ 会删除数据库数据）
docker compose down -v
# 或：docker-compose down -v
```

## 🔍 故障排查

### MySQL 连接失败

1. 检查 MySQL 是否运行：
   ```bash
   # Docker
   docker-compose ps

   # 本地 MySQL
   brew services list | grep mysql
   ```

2. 测试数据库连接：
   ```bash
   mysql -u root -p -h localhost -P 3306
   ```

3. 检查 `.env` 文件中的 `DATABASE_URL` 配置是否正确

### 端口被占用

如果 3306 端口被占用，可以修改 Docker Compose 端口映射：
```yaml
ports:
  - "3307:3306"  # 改为其他端口
```

然后更新 `.env`：
```env
DATABASE_URL="mysql://root:rootpassword@localhost:3307/storyx_admin?schema=public"
```

## 📚 更多帮助

详细文档请查看：
- `database-setup.md` - 完整的数据库设置指南
- `env-setup.md` - 环境变量配置说明
- `README.md` - 项目文档

