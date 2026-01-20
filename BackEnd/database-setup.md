# 数据库设置指南

## 问题诊断

如果遇到以下错误：
```
Error: P1001: Can't reach database server at `localhost:3306`
```

说明 MySQL 数据库服务器未运行或连接配置不正确。

## 解决方案

### 方案一：安装并启动 MySQL（macOS - Homebrew）

#### 1. 安装 MySQL

```bash
# 使用 Homebrew 安装 MySQL
brew install mysql

# 或安装 MySQL 8.0
brew install mysql@8.0
```

#### 2. 启动 MySQL 服务

```bash
# 启动 MySQL 服务
brew services start mysql

# 或手动启动（不随系统启动）
mysql.server start
```

#### 3. 验证 MySQL 是否运行

```bash
# 检查服务状态
brew services list | grep mysql

# 或尝试连接
mysql -u root -p
```

#### 4. 设置 root 密码（首次安装）

```bash
# 运行安全配置脚本
mysql_secure_installation
```

按照提示：
- 设置 root 密码
- 移除匿名用户（可选）
- 禁止 root 远程登录（可选）
- 移除 test 数据库（可选）
- 重新加载权限表

### 方案二：使用 Docker 运行 MySQL

#### 1. 创建 Docker Compose 配置

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: storyx-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: storyx_admin
      MYSQL_USER: storyx_user
      MYSQL_PASSWORD: storyx_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

volumes:
  mysql_data:
```

#### 2. 启动 MySQL 容器

```bash
# 在项目根目录运行
# 新版本 Docker 使用：docker compose（无连字符）
docker compose up -d

# 旧版本使用：docker-compose（有连字符）
# docker-compose up -d

# 查看容器状态
docker compose ps
# 或：docker-compose ps

# 查看日志
docker compose logs mysql
# 或：docker-compose logs mysql
```

#### 3. 更新 .env 文件

```env
# 使用 Docker 容器中的 MySQL
DATABASE_URL="mysql://storyx_user:storyx_password@localhost:3306/storyx_admin?schema=public"

# 或使用 root 用户
DATABASE_URL="mysql://root:rootpassword@localhost:3306/storyx_admin?schema=public"
```

### 方案三：使用云数据库

如果使用云数据库（如 AWS RDS、阿里云 RDS 等），更新 `.env` 文件：

```env
DATABASE_URL="mysql://用户名:密码@数据库主机:端口/数据库名?schema=public"
```

示例：
```env
DATABASE_URL="mysql://admin:password@your-db-host.amazonaws.com:3306/storyx_admin?schema=public"
```

## 创建数据库

MySQL 服务启动后，创建数据库：

### 方法一：使用 MySQL 命令行

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE storyx_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户并授权（可选）
CREATE USER 'storyx_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON storyx_admin.* TO 'storyx_user'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

### 方法二：使用 Prisma Migrate（自动创建）

如果数据库服务器运行正常，Prisma 会自动创建数据库：

```bash
cd BackEnd
npm run prisma:migrate
```

## 更新 .env 配置

根据你的数据库配置，更新 `BackEnd/.env` 文件：

```env
# 示例 1: 使用 root 用户
DATABASE_URL="mysql://root:your_password@localhost:3306/storyx_admin?schema=public"

# 示例 2: 使用专用用户
DATABASE_URL="mysql://storyx_user:your_password@localhost:3306/storyx_admin?schema=public"

# 示例 3: 远程数据库
DATABASE_URL="mysql://user:password@192.168.1.100:3306/storyx_admin?schema=public"
```

## 运行数据库迁移

数据库准备好后，运行以下命令：

```bash
cd BackEnd

# 1. 生成 Prisma 客户端
npm run prisma:generate

# 2. 运行数据库迁移（创建表结构）
npm run prisma:migrate

# 3. 初始化种子数据（创建默认管理员）
npm run prisma:seed
```

## 验证数据库连接

### 测试连接

```bash
# 使用 MySQL 客户端测试
mysql -u root -p -h localhost -P 3306 storyx_admin

# 或使用 Prisma Studio 查看数据库
npm run prisma:studio
```

### 常见问题排查

#### 1. 端口被占用

```bash
# 检查端口占用
lsof -i :3306

# 如果被占用，可以修改 MySQL 端口或停止占用进程
```

#### 2. 权限问题

确保数据库用户有足够的权限：

```sql
GRANT ALL PRIVILEGES ON storyx_admin.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. 防火墙问题

确保防火墙允许 3306 端口的连接（如果使用远程数据库）。

#### 4. 连接字符串格式错误

确保 `.env` 中的 `DATABASE_URL` 格式正确：
- 使用双引号包围整个连接字符串
- 确保特殊字符正确转义
- 端口号正确（默认 3306）

## 快速检查清单

- [ ] MySQL 服务正在运行
- [ ] 数据库已创建（`storyx_admin`）
- [ ] `.env` 文件中的 `DATABASE_URL` 配置正确
- [ ] 数据库用户有足够的权限
- [ ] 可以成功连接数据库（`mysql -u root -p`）
- [ ] 已运行 `npm run prisma:generate`
- [ ] 已运行 `npm run prisma:migrate`
- [ ] 已运行 `npm run prisma:seed`

## 下一步

数据库设置完成后，可以启动项目：

```bash
npm run dev
```

访问 Swagger API 文档：
- http://localhost:3000/api-docs

默认管理员账号（通过 seed 创建）：
- 用户名: `admin`
- 密码: `admin123456`

⚠️ **生产环境请务必修改默认密码！**

