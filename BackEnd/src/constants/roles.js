/**
 * 用户角色常量
 */
const ROLES = {
  // 管理员角色（后台系统）
  SUPER_ADMIN: 'super_admin',        // 超级管理员
  PLATFORM_ADMIN: 'platform_admin',  // 平台管理员
  OPERATOR: 'operator',              // 运营人员
  RISK_CONTROL: 'risk_control',      // 风控人员
  FINANCE: 'finance',                // 财务人员
  READ_ONLY: 'read_only',            // 只读角色

  // 普通用户角色（C端用户）
  USER: 'user',                       // 已认证用户
  BASIC_USER: 'basic_user'            // 未认证用户（基础角色，注册时默认）
};

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    'user:*',
    'model:*',
    'provider:*',
    'package:*',
    'quota:*',
    'prompt:*',
    'risk:*',
    'authorization:*',
    'log:*'
  ],
  [ROLES.PLATFORM_ADMIN]: [
    'user:read',
    'user:write',
    'model:read',
    'model:write',
    'provider:read',
    'package:read',
    'package:write'
  ],
  [ROLES.OPERATOR]: [
    'user:read',
    'user:write',
    'package:read',
    'package:write'
  ],
  [ROLES.RISK_CONTROL]: [
    'user:read',
    'risk:read',
    'risk:write',
    'log:read'
  ],
  [ROLES.FINANCE]: [
    'quota:read',
    'package:read',
    'log:read'
  ],
  [ROLES.READ_ONLY]: [
    'user:read',
    'model:read',
    'provider:read',
    'package:read',
    'quota:read',
    'prompt:read',
    'risk:read',
    'log:read'
  ]
};

module.exports = {
  ROLES,
  ROLE_PERMISSIONS
};
