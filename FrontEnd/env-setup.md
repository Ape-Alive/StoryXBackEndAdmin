# 环境配置说明

## 环境文件

需要在 `FrontEnd` 目录下创建以下环境文件：

### 1. `.env` - 通用环境变量

```env
# 环境变量配置
# 所有环境通用配置

# 应用标题
VITE_APP_TITLE=AI 能力中台后台管理系统

# API 请求超时时间（毫秒）
VITE_API_TIMEOUT=30000
```

### 2. `.env.development` - 开发环境

```env
# 开发环境配置
NODE_ENV=development

# API 基础地址
VITE_API_BASE_URL=http://localhost:5800

# 是否开启 Mock
VITE_USE_MOCK=false

# 是否开启代理
VITE_USE_PROXY=true
```

### 3. `.env.test` - 测试环境

```env
# 测试环境配置
NODE_ENV=test

# API 基础地址
VITE_API_BASE_URL=http://test-api.example.com

# 是否开启 Mock
VITE_USE_MOCK=false

# 是否开启代理
VITE_USE_PROXY=false
```

### 4. `.env.staging` - 预发布环境

```env
# 预发布环境配置
NODE_ENV=production

# API 基础地址
VITE_API_BASE_URL=https://staging-api.example.com

# 是否开启 Mock
VITE_USE_MOCK=false

# 是否开启代理
VITE_USE_PROXY=false
```

### 5. `.env.production` - 生产环境

```env
# 生产环境配置
NODE_ENV=production

# API 基础地址
VITE_API_BASE_URL=https://api.example.com

# 是否开启 Mock
VITE_USE_MOCK=false

# 是否开启代理
VITE_USE_PROXY=false
```

## 快速创建

可以使用以下命令快速创建所有环境文件：

```bash
cd FrontEnd

# 创建通用环境变量
cat > .env << 'EOF'
VITE_APP_TITLE=AI 能力中台后台管理系统
VITE_API_TIMEOUT=30000
EOF

# 创建开发环境
cat > .env.development << 'EOF'
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:5800
VITE_USE_MOCK=false
VITE_USE_PROXY=true
EOF

# 创建测试环境
cat > .env.test << 'EOF'
NODE_ENV=test
VITE_API_BASE_URL=http://test-api.example.com
VITE_USE_MOCK=false
VITE_USE_PROXY=false
EOF

# 创建预发布环境
cat > .env.staging << 'EOF'
NODE_ENV=production
VITE_API_BASE_URL=https://staging-api.example.com
VITE_USE_MOCK=false
VITE_USE_PROXY=false
EOF

# 创建生产环境
cat > .env.production << 'EOF'
NODE_ENV=production
VITE_API_BASE_URL=https://api.example.com
VITE_USE_MOCK=false
VITE_USE_PROXY=false
EOF
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_BASE_URL` | API 基础地址 | `http://localhost:5800` |
| `VITE_API_TIMEOUT` | API 请求超时时间（毫秒） | `30000` |
| `VITE_APP_TITLE` | 应用标题 | `AI 能力中台后台管理系统` |
| `VITE_USE_MOCK` | 是否开启 Mock | `false` |
| `VITE_USE_PROXY` | 是否开启代理 | `true`（开发环境） |

## 使用方式

### 在代码中使用

```javascript
import { API_BASE_URL, IS_DEV, IS_PROD, API_TIMEOUT } from '@/config/env'

console.log('API地址:', API_BASE_URL)
console.log('是否开发环境:', IS_DEV)
console.log('是否生产环境:', IS_DEV)
```

### 启动不同环境

```bash
# 开发环境（默认）
npm run dev

# 测试环境
npm run dev:test

# 预发布环境
npm run dev:staging
```

### 构建不同环境

```bash
# 生产环境
npm run build

# 测试环境
npm run build:test

# 预发布环境
npm run build:staging
```

## 注意事项

1. 环境变量必须以 `VITE_` 开头才能在客户端代码中访问
2. 修改环境变量后需要重启开发服务器
3. `.env` 文件不应提交到 Git（已在 `.gitignore` 中）
4. 开发环境建议开启代理（`VITE_USE_PROXY=true`）
5. 生产环境应关闭代理，直接使用 `VITE_API_BASE_URL`

