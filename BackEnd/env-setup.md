# 环境变量配置说明

## 创建 .env 文件

由于 `.env` 文件已被添加到 `.gitignore`，需要手动创建。请按照以下步骤操作：

### 方法一：复制示例文件

```bash
cd BackEnd
cp env.example .env
```

### 方法二：手动创建

在 `BackEnd` 目录下创建 `.env` 文件，内容如下：

```env
# ==================== 服务器配置 ====================
NODE_ENV=development
PORT=3000

# ==================== 数据库配置 (Prisma) ====================
DATABASE_URL="mysql://root:password@localhost:3306/storyx_admin?schema=public"

# ==================== JWT 配置 ====================
JWT_SECRET=your-secret-key-change-in-production-please-use-strong-random-string
JWT_EXPIRES_IN=24h

# ==================== CORS 配置 ====================
CORS_ORIGIN=http://localhost:3001

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_DIR=./logs

# ==================== SMTP 配置（邮箱验证码） ====================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@example.com

# ==================== API 配置 ====================
API_BASE_URL=http://localhost:3000
```

## 必需配置项

### 1. 数据库配置 (DATABASE_URL)

修改 `DATABASE_URL` 为你的 MySQL 数据库连接信息：

```env
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名?schema=public"
```

**示例：**
- 本地开发：`mysql://root:password@localhost:3306/storyx_admin?schema=public`
- 远程服务器：`mysql://user:pass@192.168.1.100:3306/storyx_admin?schema=public`

### 2. JWT 密钥配置 (JWT_SECRET)

**⚠️ 重要：生产环境必须修改为强随机字符串！**

生成随机密钥的命令：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

或者使用：
```bash
openssl rand -hex 32
```

将生成的密钥复制到 `JWT_SECRET` 配置项。

### 3. SMTP 配置（邮箱验证码）

#### Gmail 配置示例：
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password  # 需要使用应用专用密码
SMTP_FROM=your-email@gmail.com
```

#### QQ 邮箱配置示例：
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code  # QQ 邮箱授权码
SMTP_FROM=your-email@qq.com
```

#### 163 邮箱配置示例：
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-authorization-code  # 163 邮箱授权码
SMTP_FROM=your-email@163.com
```

## 可选配置项

### Redis 配置（如果使用）
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### CORS 配置
```env
# 单个地址
CORS_ORIGIN=http://localhost:3001

# 多个地址（开发环境）
# CORS_ORIGIN=http://localhost:3001,http://localhost:3002
```

## 配置完成后

1. 确保 MySQL 数据库已创建：
   ```sql
   CREATE DATABASE storyx_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. 运行数据库迁移：
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

3. 初始化种子数据（创建默认管理员）：
   ```bash
   npm run prisma:seed
   ```

4. 启动项目：
   ```bash
   npm run dev
   ```

## 生产环境注意事项

⚠️ **重要：生产环境部署前必须修改以下配置：**

1. **JWT_SECRET**: 使用强随机字符串（至少32个字符）
2. **DATABASE_URL**: 使用生产数据库连接信息
3. **NODE_ENV**: 设置为 `production`
4. **SMTP 配置**: 使用生产环境的邮件服务器
5. **CORS_ORIGIN**: 设置为生产环境的前端地址
6. **LOG_LEVEL**: 建议设置为 `warn` 或 `error`

## 安全建议

1. 永远不要将 `.env` 文件提交到 Git 仓库
2. 使用不同的密钥用于开发和生产环境
3. 定期更换 JWT_SECRET
4. 使用强密码保护数据库
5. 限制数据库访问权限（仅允许必要的主机连接）

