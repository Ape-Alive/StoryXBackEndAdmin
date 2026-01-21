/**
 * 环境配置
 * 通过 import.meta.env 访问 Vite 环境变量
 */

// 环境类型
export const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
}

// 当前环境
export const NODE_ENV = import.meta.env.NODE_ENV || ENV.DEVELOPMENT
export const MODE = import.meta.env.MODE || ENV.DEVELOPMENT

// API 配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000

// 应用配置
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'AI 能力中台后台管理系统'

// 功能开关
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true'

// 是否为开发环境
export const IS_DEV = MODE === ENV.DEVELOPMENT

// 是否为生产环境
export const IS_PROD = MODE === ENV.PRODUCTION

// 是否为测试环境
export const IS_TEST = MODE === ENV.TEST

// 是否为预发布环境
export const IS_STAGING = MODE === ENV.STAGING

// 输出配置信息（仅开发环境）
if (IS_DEV) {
  console.log('🔧 环境配置:', {
    NODE_ENV,
    MODE,
    API_BASE_URL,
    API_TIMEOUT,
    APP_TITLE,
    USE_MOCK,
    USE_PROXY
  })
}

