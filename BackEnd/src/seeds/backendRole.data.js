const { ROLES } = require('../constants/roles')

const BACKEND_ROLE_SEEDS = [
  {
    id: 'br-super-admin',
    roleKey: ROLES.SUPER_ADMIN,
    name: '超级管理员',
    description: '拥有系统全部权限，可管理所有模块与角色配置。',
    isSystem: true,
    sortOrder: 10,
  },
  {
    id: 'br-platform-admin',
    roleKey: ROLES.PLATFORM_ADMIN,
    name: '平台管理员',
    description: '负责平台日常运营与用户、模型、套餐等核心模块管理。',
    isSystem: true,
    sortOrder: 20,
  },
  {
    id: 'br-operator',
    roleKey: ROLES.OPERATOR,
    name: '运营人员',
    description: '负责用户运营与套餐相关业务操作。',
    isSystem: true,
    sortOrder: 30,
  },
  {
    id: 'br-risk-control',
    roleKey: ROLES.RISK_CONTROL,
    name: '风控人员',
    description: '负责风控规则、安全日志与用户风险审查。',
    isSystem: true,
    sortOrder: 40,
  },
  {
    id: 'br-finance',
    roleKey: ROLES.FINANCE,
    name: '财务人员',
    description: '负责额度、订单、套餐等财务相关模块查看与管理。',
    isSystem: true,
    sortOrder: 50,
  },
  {
    id: 'br-read-only',
    roleKey: ROLES.READ_ONLY,
    name: '只读角色',
    description: '仅可查看各业务模块数据，不可执行写操作。',
    isSystem: true,
    sortOrder: 60,
  },
]

module.exports = { BACKEND_ROLE_SEEDS }
