# AI 能力中台后台管理系统 - 前端

基于 Vue3 + Pinia + Axios + Vite + Vue Router 构建的前端项目。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Axios** - HTTP 客户端
- **Vite** - 构建工具
- **Element Plus** - UI 组件库

## 项目结构

```
FrontEnd/
├── src/
│   ├── api/              # API 接口模块
│   │   ├── auth.js      # 认证相关接口
│   │   └── request.js   # Axios 封装
│   ├── assets/          # 静态资源
│   ├── components/      # 公共组件
│   ├── config/          # 配置文件
│   │   ├── env.js       # 环境配置
│   │   └── index.js     # 配置统一导出
│   ├── layouts/         # 布局组件
│   │   └── MainLayout.vue
│   ├── router/          # 路由配置
│   │   └── index.js
│   ├── stores/          # Pinia 状态管理
│   │   └── auth.js      # 认证状态
│   ├── styles/          # 全局样式
│   │   └── index.css
│   ├── utils/           # 工具函数
│   │   └── auth.js      # 认证工具
│   ├── views/           # 页面组件
│   │   ├── auth/        # 认证页面
│   │   │   └── Login.vue
│   │   └── dashboard/   # 仪表盘
│   │       └── Index.vue
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── .env                  # 通用环境变量
├── .env.development      # 开发环境
├── .env.test            # 测试环境
├── .env.staging         # 预发布环境
├── .env.production      # 生产环境
├── .env.example         # 环境变量示例
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 环境配置

### 环境文件说明

- `.env` - 所有环境通用配置
- `.env.development` - 开发环境（默认）
- `.env.test` - 测试环境
- `.env.staging` - 预发布环境
- `.env.production` - 生产环境

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_BASE_URL` | API 基础地址 | `http://localhost:5800` |
| `VITE_API_TIMEOUT` | API 请求超时时间（毫秒） | `30000` |
| `VITE_APP_TITLE` | 应用标题 | `AI 能力中台后台管理系统` |
| `VITE_USE_MOCK` | 是否开启 Mock | `false` |
| `VITE_USE_PROXY` | 是否开启代理 | `true`（开发环境） |

### 使用环境变量

在代码中使用环境变量：

```javascript
import { API_BASE_URL, IS_DEV, IS_PROD } from '@/config/env'

console.log('API地址:', API_BASE_URL)
console.log('是否开发环境:', IS_DEV)
```

## 安装依赖

```bash
npm install
```

## 开发

### 开发环境（默认）

```bash
npm run dev
```

访问 http://localhost:3000

### 测试环境

```bash
npm run dev:test
```

### 预发布环境

```bash
npm run dev:staging
```

## 构建

### 生产环境构建

```bash
npm run build
```

### 测试环境构建

```bash
npm run build:test
```

### 预发布环境构建

```bash
npm run build:staging
```

## 预览

### 预览生产构建

```bash
npm run preview
```

### 预览测试构建

```bash
npm run preview:test
```

### 预览预发布构建

```bash
npm run preview:staging
```

## 模块化设计说明

### API 模块 (`src/api/`)
按功能模块组织 API 接口：
- `auth.js` - 认证相关接口
- `user.js` - 用户管理接口（待扩展）
- `model.js` - 模型管理接口（待扩展）
- `package.js` - 套餐管理接口（待扩展）
- ...

### Store 模块 (`src/stores/`)
按功能模块组织状态管理：
- `auth.js` - 认证状态
- `user.js` - 用户状态（待扩展）
- `model.js` - 模型状态（待扩展）
- ...

### Views 模块 (`src/views/`)
按功能模块组织页面：
- `auth/` - 认证相关页面
- `dashboard/` - 仪表盘
- `user/` - 用户管理（待扩展）
- `model/` - 模型管理（待扩展）
- ...

## 注意事项

1. 环境变量必须以 `VITE_` 开头才能在客户端代码中访问
2. 开发环境建议开启代理（`VITE_USE_PROXY=true`）
3. 生产环境应关闭代理，直接使用 `VITE_API_BASE_URL`
4. 修改环境变量后需要重启开发服务器
