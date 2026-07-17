/**
 * 后台管理前端菜单种子数据
 * 来源：FrontEnd/src/config/menu.js
 */

function zh(label) {
  return [{ language: 'zh', label }]
}

function permCodes(scope, key) {
  const code = `${scope}_MENU_${key.replace(/-/g, '_').toUpperCase()}`
  return {
    frontendPermissionCode: `${code}_VIEW`,
    backendPermissionCode: `${code}_MANAGE`,
  }
}

const BACKEND_MENU_GROUPS = [
  {
    id: 'bm-group-command-center',
    name: '指挥中心',
    path: '/menu-group/command-center',
    sortOrder: 10,
    children: [
      {
        id: 'bm-dashboard',
        key: 'dashboard',
        name: '运行总览大屏',
        path: '/dashboard',
        sortOrder: 10,
      },
    ],
  },
  {
    id: 'bm-group-system',
    name: '系统管理',
    path: '/menu-group/system',
    sortOrder: 20,
    children: [
      { id: 'bm-backend-menu', key: 'backend-menu-manage', name: '后台菜单管理', path: '/system/backend-menu', sortOrder: 10 },
      { id: 'bm-client-menu', key: 'client-menu-manage', name: '客户端菜单管理', path: '/system/client-menu', sortOrder: 20 },
      { id: 'bm-backend-role', key: 'backend-role-permission', name: '后台角色权限管理', path: '/system/backend-role', sortOrder: 30 },
      { id: 'bm-client-role', key: 'client-role-permission', name: '客户端角色权限管理', path: '/system/client-role', sortOrder: 40 },
      { id: 'bm-ota-releases', key: 'ota-releases', name: 'OTA 发布管理', path: '/system/ota-releases', sortOrder: 50 },
    ],
  },
  {
    id: 'bm-group-user',
    name: '用户管理',
    path: '/menu-group/user',
    sortOrder: 30,
    children: [
      { id: 'bm-system-user-list', key: 'system-user-list', name: '系统用户列表', path: '/system-user/list', sortOrder: 10 },
      { id: 'bm-terminal-user-list', key: 'terminal-user-list', name: '终端用户列表', path: '/terminal-user/list', sortOrder: 20 },
      { id: 'bm-device-manage', key: 'device-manage', name: '安全设备管理', path: '/terminal-user/device', sortOrder: 30 },
      { id: 'bm-user-package', key: 'user-package', name: '用户套餐管理', path: '/terminal-user/package', sortOrder: 40 },
      { id: 'bm-user-quota', key: 'user-quota', name: '用户额度管理', path: '/terminal-user/quota', sortOrder: 50 },
      { id: 'bm-activation-codes', key: 'activation-codes', name: '激活码管理', path: '/terminal-user/activation-codes', sortOrder: 60 },
    ],
  },
  {
    id: 'bm-group-model',
    name: '模型矩阵',
    path: '/menu-group/model',
    sortOrder: 40,
    children: [
      { id: 'bm-provider', key: 'provider', name: '提供商配置', path: '/model/provider', sortOrder: 10 },
      { id: 'bm-model-list', key: 'model-list', name: '模型实例列表', path: '/model/list', sortOrder: 20 },
      { id: 'bm-pricing', key: 'pricing', name: '计费策略配置', path: '/model/pricing', sortOrder: 30 },
    ],
  },
  {
    id: 'bm-group-finance',
    name: '财务治理',
    path: '/menu-group/finance',
    sortOrder: 50,
    children: [
      { id: 'bm-packages', key: 'packages', name: '商业套餐定义', path: '/finance/package/list', sortOrder: 10 },
      { id: 'bm-quota', key: 'quota', name: '订单结算管理', path: '/finance/quota/list', sortOrder: 20 },
      { id: 'bm-billing-logs', key: 'billing-logs', name: '额度流水管理', path: '/finance/quota/billing', sortOrder: 30 },
    ],
  },
  {
    id: 'bm-group-security',
    name: '安全防护',
    path: '/menu-group/security',
    sortOrder: 60,
    children: [
      { id: 'bm-risk-rules', key: 'risk-rules', name: '风控拦截引擎', path: '/risk/rules', sortOrder: 10 },
      { id: 'bm-intercept', key: 'intercept', name: '安全日志审计', path: '/risk/logs', sortOrder: 20 },
    ],
  },
  {
    id: 'bm-group-resource',
    name: '资源库',
    path: '/menu-group/resource',
    sortOrder: 70,
    children: [
      { id: 'bm-system-prompt-list', key: 'system-prompt-list', name: '系统提示词库', path: '/prompt/system-prompt-list', sortOrder: 10 },
      { id: 'bm-user-prompt-list', key: 'user-prompt-list', name: '用户提示词库', path: '/prompt/user-prompt-list', sortOrder: 20 },
      { id: 'bm-prompt-category', key: 'prompt-category', name: '提示词分类管理', path: '/prompt/prompt-category', sortOrder: 30 },
      { id: 'bm-style-library', key: 'style-library', name: '风格库', path: '/resource/style-library', sortOrder: 40 },
      { id: 'bm-camera-movement-library', key: 'camera-movement-library', name: '运镜库', path: '/resource/camera-movement-library', sortOrder: 50 },
      { id: 'bm-voice-profiles', key: 'voice-profiles', name: '音色库', path: '/voice/profiles', sortOrder: 60 },
    ],
  },
  {
    id: 'bm-group-authorization',
    name: '授权管理',
    path: '/menu-group/authorization',
    sortOrder: 80,
    children: [
      { id: 'bm-authorization-list', key: 'authorization-list', name: '授权记录', path: '/authorization/list', sortOrder: 10 },
      { id: 'bm-authorization-stats', key: 'authorization-stats', name: '授权统计', path: '/authorization/stats', sortOrder: 20 },
    ],
  },
  {
    id: 'bm-group-log',
    name: '日志审计',
    path: '/menu-group/log',
    sortOrder: 90,
    children: [
      { id: 'bm-operation-logs', key: 'operation-logs', name: '操作日志', path: '/log/operation', sortOrder: 10 },
      { id: 'bm-ai-call-logs', key: 'ai-call-logs', name: 'AI调用日志', path: '/log/ai-call', sortOrder: 20 },
    ],
  },
]

function flattenBackendMenus() {
  const menus = []
  for (const group of BACKEND_MENU_GROUPS) {
    const groupPerms = permCodes('BACKEND', group.id.replace('bm-group-', ''))
    menus.push({
      id: group.id,
      name: group.name,
      i18nNames: zh(group.name),
      path: group.path,
      parentId: '0',
      sortOrder: group.sortOrder,
      ...groupPerms,
    })
    for (const child of group.children) {
      const childPerms = permCodes('BACKEND', child.key)
      menus.push({
        id: child.id,
        name: child.name,
        i18nNames: zh(child.name),
        path: child.path,
        parentId: group.id,
        sortOrder: child.sortOrder,
        ...childPerms,
      })
    }
  }
  return menus
}

module.exports = {
  BACKEND_MENU_GROUPS,
  flattenBackendMenus,
}
