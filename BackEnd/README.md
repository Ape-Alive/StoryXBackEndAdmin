# AI 能力中台后台管理系统 - 后端服务

## 项目结构

```
BackEnd/
├── prisma/
│   ├── schema.prisma      # Prisma 数据库 Schema
│   └── seed.js            # 数据库种子文件
├── src/
│   ├── config/            # 配置文件
│   │   └── database.js    # Prisma 客户端配置
│   ├── controllers/       # 控制器层 - 处理 HTTP 请求和响应
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── provider.controller.js
│   │   ├── model.controller.js
│   │   └── log.controller.js
│   ├── services/          # 服务层 - 业务逻辑处理
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── provider.service.js
│   │   ├── model.service.js
│   │   └── log.service.js
│   ├── repositories/      # 数据访问层 - Prisma 数据库操作
│   │   ├── user.repository.js
│   │   ├── provider.repository.js
│   │   └── model.repository.js
│   ├── routes/            # 路由定义
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── provider.routes.js
│   │   ├── model.routes.js
│   │   └── log.routes.js
│   ├── middleware/        # 中间件
│   │   ├── auth.js       # JWT 认证和权限控制
│   │   ├── errorHandler.js # 全局错误处理
│   │   ├── logger.js     # 请求日志
│   │   └── validate.js   # 请求验证
│   ├── validators/        # 请求验证规则
│   │   ├── user.validator.js
│   │   ├── provider.validator.js
│   │   └── model.validator.js
│   ├── utils/            # 工具类
│   │   ├── errors.js    # 自定义错误类
│   │   ├── logger.js    # Winston 日志工具
│   │   └── response.js  # 统一响应格式
│   └── constants/        # 常量定义
│       ├── roles.js     # 角色常量
│       ├── userStatus.js # 用户状态常量
│       └── modelType.js # 模型类型常量
├── logs/                  # 日志目录
├── app.js                 # Express 应用配置
├── server.js             # 服务器入口
├── package.json          # 项目配置
└── .gitignore           # Git 忽略文件
```

## 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **ORM**: Prisma
- **数据库**: MySQL
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **验证**: express-validator
- **日志**: Winston
- **安全**: Helmet, CORS
- **压缩**: compression
- **文件上传**: Multer
- **Excel 处理**: XLSX
- **邮件发送**: Nodemailer
- **API 文档**: Swagger (swagger-jsdoc, swagger-ui-express)

## 已实现功能模块

### ✅ 1. 认证模块
- 发送注册验证码（邮箱验证码）
- 管理员注册（除超级管理员外的所有角色，邮箱验证码注册）
- Excel 批量导入注册（仅管理员可操作，跳过验证码验证）
- 管理员登录（JWT）
- 获取当前管理员信息
- 修改密码

### ✅ 2. 用户管理模块
- 用户列表查询（分页、筛选、排序）
- 用户详情查看（包含使用统计）
- 用户状态管理（冻结、封禁）
- 用户设备管理（查看、解绑）
- 用户数据导出

### ✅ 3. 提供商管理模块（仅超级管理员）
- 提供商列表查询
- 提供商详情查看
- 创建提供商
- 更新提供商
- 删除提供商
- 启用/禁用提供商

### ✅ 4. 模型管理模块
- 模型列表查询（分页、筛选、排序）
- 模型详情查看
- 创建模型
- 更新模型
- 删除模型
- 批量操作（状态更新、删除）
- 模型价格管理

### ✅ 5. 日志与审计模块
- 管理员操作日志查询
- AI 调用日志查询
- 日志详情查看

## 待实现模块

- ⏳ 套餐管理模块
- ⏳ 额度管理模块
- ⏳ 提示词库管理模块
- ⏳ 风控与监控模块
- ⏳ 授权与调用管理模块

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration (Prisma)
DATABASE_URL="mysql://user:password@localhost:3306/storyx_admin?schema=public"

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:3001

# Log Configuration
LOG_LEVEL=info
LOG_DIR=./logs

# SMTP Configuration (for email verification)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 初始化种子数据（创建默认管理员）
npm run prisma:seed
```

### 4. 运行项目

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

### 5. 访问 API 文档

启动项目后，访问以下地址查看 Swagger API 文档：

- **Swagger UI**: http://localhost:3000/api-docs
- **API 规范 JSON**: http://localhost:3000/api-docs.json
- **API 路径列表**: http://localhost:3000/api/docs/paths
- **API 规范（用于 ApiFix）**: http://localhost:3000/api/docs/spec

### 6. 打开 Prisma Studio（可选）

```bash
npm run prisma:studio
```

## API 路由

### 认证
- `POST /api/auth/send-register-code` - 发送注册验证码（无需认证）
- `POST /api/auth/register` - 管理员注册（无需认证，除超级管理员外的所有角色）
- `POST /api/auth/batch-import-register` - Excel 批量导入注册（需要认证，仅超级管理员和平台管理员）
- `POST /api/auth/batch-import-register-file` - Excel 批量导入注册（返回 Excel 结果文件）
- `POST /api/auth/login` - 管理员登录（无需认证）
- `GET /api/auth/me` - 获取当前管理员信息（需要认证）
- `POST /api/auth/change-password` - 修改密码（需要认证）

### 用户管理
- `GET /api/users` - 获取用户列表（需要认证）
- `GET /api/users/:userId` - 获取用户详情（需要认证）
- `PATCH /api/users/:userId/status` - 更新用户状态（需要认证）
- `GET /api/users/:userId/devices` - 获取用户设备列表（需要认证）
- `DELETE /api/users/:userId/devices` - 解绑设备（需要认证）
- `POST /api/users/export` - 导出用户数据（需要认证）

### 提供商管理
- `GET /api/providers` - 获取提供商列表（需要认证）
- `GET /api/providers/:id` - 获取提供商详情（需要认证）
- `POST /api/providers` - 创建提供商（仅超级管理员）
- `PUT /api/providers/:id` - 更新提供商（仅超级管理员）
- `PATCH /api/providers/:id/status` - 更新提供商状态（仅超级管理员）
- `DELETE /api/providers/:id` - 删除提供商（仅超级管理员）

### 模型管理
- `GET /api/models` - 获取模型列表（需要认证）
- `GET /api/models/:id` - 获取模型详情（需要认证）
- `POST /api/models` - 创建模型（需要认证）
- `PUT /api/models/:id` - 更新模型（需要认证）
- `PATCH /api/models/:id/status` - 更新模型状态（需要认证）
- `DELETE /api/models/:id` - 删除模型（需要认证）
- `PATCH /api/models/batch/status` - 批量更新模型状态（需要认证）
- `DELETE /api/models/batch` - 批量删除模型（需要认证）
- `GET /api/models/:id/prices` - 获取模型价格列表（需要认证）
- `POST /api/models/:id/prices` - 创建模型价格（需要认证）
- `PUT /api/models/:id/prices/:priceId` - 更新模型价格（需要认证）

### 日志与审计
- `GET /api/logs/operation` - 获取管理员操作日志（需要认证）
- `GET /api/logs/operation/:id` - 获取操作日志详情（需要认证）
- `GET /api/logs/ai` - 获取 AI 调用日志（需要认证）
- `GET /api/logs/ai/:requestId` - 获取 AI 调用日志详情（需要认证）

### API 文档
- `GET /api-docs` - Swagger UI 界面（HTML）
- `GET /api-docs.json` - API 规范 JSON（OpenAPI 3.0）
- `GET /api/docs/spec` - API 规范 JSON（用于 ApiFix 拉取）
- `GET /api/docs/paths` - API 路径列表

## 权限控制

系统支持以下角色：

- **super_admin** (超级管理员): 全功能权限
- **platform_admin** (平台管理员): 用户管理、模型管理、套餐管理
- **operator** (运营人员): 用户管理、套餐运营
- **risk_control** (风控人员): 风控规则配置、告警处理
- **finance** (财务人员): 结算管理、流水查询
- **read_only** (只读角色): 仅查看权限

## 开发规范

### 1. 错误处理

使用统一的自定义错误类：

```javascript
const { NotFoundError, BadRequestError } = require('../utils/errors');
throw new NotFoundError('User not found');
```

### 2. 响应格式

使用统一的响应工具：

```javascript
const ResponseHandler = require('../utils/response');
ResponseHandler.success(res, data, 'Success');
ResponseHandler.paginated(res, data, pagination);
```

### 3. 权限控制

使用中间件进行权限控制：

```javascript
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');
router.get('/', authenticate, authorize(ROLES.SUPER_ADMIN), controller);
```

### 4. 请求验证

使用 express-validator 进行请求验证：

```javascript
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const validator = [
  body('email').isEmail().withMessage('Invalid email'),
  validate
];
```

## 数据库 Schema

使用 Prisma 管理数据库 Schema，主要表包括：

- `admins` - 管理员账号
- `users` - 终端用户
- `devices` - 用户设备
- `ai_providers` - AI 模型提供商
- `ai_models` - AI 模型
- `model_prices` - 模型价格配置
- `packages` - 套餐
- `user_packages` - 用户套餐关系
- `user_quotas` - 用户额度
- `quota_records` - 额度流水记录
- `prompt_categories` - 提示词分类
- `prompts` - 提示词
- `prompt_versions` - 提示词版本
- `authorizations` - 授权记录
- `operation_logs` - 管理员操作日志
- `ai_call_logs` - AI 调用日志
- `risk_rules` - 风控规则
- `risk_triggers` - 风控触发记录

## Excel 批量导入注册

### Excel 格式要求

1. **必需列**：
   - `username` - 用户名（3-20个字符，只能包含字母、数字和下划线）
   - `email` - 邮箱（有效邮箱格式）
   - `role` - 角色（platform_admin, operator, risk_control, finance, read_only）

2. **可选列**：
   - `password` - 密码（如果为空，将使用默认密码或生成随机密码）

3. **示例**：
   ```
   username      | email              | role           | password
   --------------|--------------------|----------------|-------------
   operator001   | op001@example.com  | operator       |
   operator002   | op002@example.com  | operator       | Pass123456
   ```

### API 使用

**JSON 格式返回**：
```bash
POST /api/auth/batch-import-register
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: <Excel文件>
defaultPassword: (可选) 默认密码
```

**Excel 文件格式返回**：
```bash
POST /api/auth/batch-import-register-file
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: <Excel文件>
defaultPassword: (可选) 默认密码
```

详细说明请参考 `templates/import-template.md`

## 注意事项

1. **默认管理员账号**：
   - 用户名: `admin`
   - 密码: `admin123456`
   - 首次运行后请立即修改密码

2. **生产环境配置**：
   - 修改 `JWT_SECRET` 为强随机字符串
   - 修改数据库连接信息
   - 配置合适的 CORS 源
   - 设置日志级别和轮转策略
   - 配置 SMTP 服务器信息（用于邮箱验证码）

3. **数据库迁移**：
   - 修改 `schema.prisma` 后运行 `npm run prisma:migrate`
   - 每次迁移都会生成新的迁移文件

4. **操作日志**：
   - 所有管理员操作都会记录日志
   - 日志不可篡改，用于审计

5. **Excel 批量导入**：
   - 仅超级管理员和平台管理员可以使用
   - 批量导入跳过邮箱验证码验证（因为是管理员操作）
   - 如果未提供密码，系统会生成随机密码并在响应中返回
   - 上传的 Excel 文件会临时存储在 `uploads/` 目录，处理完成后自动删除

## License

ISC