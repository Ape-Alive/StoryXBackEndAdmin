/**
 * 菜单配置
 * 参考 React 版本的菜单结构
 */

export function menuKeyToViewPermission(menuKey) {
  return `BACKEND_MENU_${String(menuKey).replace(/-/g, '_').toUpperCase()}_VIEW`
}

export function menuKeyToManagePermission(menuKey) {
  return `BACKEND_MENU_${String(menuKey).replace(/-/g, '_').toUpperCase()}_MANAGE`
}

function withPermissions(structure) {
  return structure.map(group => ({
    ...group,
    children: group.children.map(child => ({
      ...child,
      permission: child.permission || menuKeyToViewPermission(child.id),
    })),
  }))
}

const RAW_MENU_STRUCTURE = [
  {
    title: '指挥中心',
    icon: 'Odometer',
    children: [{ id: 'dashboard', label: '运行总览大屏', path: '/dashboard', icon: 'Odometer' }]
  },
  {
    title: '系统管理',
    icon: 'User',
    children: [
      {
        id: 'backend-menu-manage',
        label: '后台菜单管理',
        path: '/system/backend-menu',
        icon: 'Menu'
      },
      {
        id: 'client-menu-manage',
        label: '客户端菜单管理',
        path: '/system/client-menu',
        icon: 'Grid'
      },
      {
        id: 'backend-role-permission',
        label: '后台角色权限管理',
        path: '/system/backend-role',
        icon: 'Key'
      },
      {
        id: 'client-role-permission',
        label: '客户端角色权限管理',
        path: '/system/client-role',
        icon: 'UserFilled'
      },
      {
        id: 'ota-releases',
        label: 'OTA 发布管理',
        path: '/system/ota-releases',
        icon: 'Upload'
      }
    ]
  },
  {
    title: '用户管理',
    icon: 'User',
    children: [
      { id: 'system-user-list', label: '系统用户列表', path: '/system-user/list', icon: 'User' },
      {
        id: 'terminal-user-list',
        label: '终端用户列表',
        path: '/terminal-user/list',
        icon: 'User'
      },
      {
        id: 'device-manage',
        label: '安全设备管理',
        path: '/terminal-user/device',
        icon: 'Monitor'
      },
      { id: 'user-package', label: '用户套餐管理', path: '/terminal-user/package', icon: 'Box' },
      { id: 'user-quota', label: '用户额度管理', path: '/terminal-user/quota', icon: 'PieChart' },
      {
        id: 'activation-codes',
        label: '激活码管理',
        path: '/terminal-user/activation-codes',
        icon: 'Key'
      }
    ]
  },
  {
    title: '模型矩阵',
    icon: 'Cpu',
    children: [
      { id: 'provider', label: '提供商配置', path: '/model/provider', icon: 'Setting' },
      { id: 'model-list', label: '模型实例列表', path: '/model/list', icon: 'Cpu' },
      { id: 'pricing', label: '计费策略配置', path: '/model/pricing', icon: 'Money' }
    ]
  },
  {
    title: '财务治理',
    icon: 'Wallet',
    children: [
      { id: 'packages', label: '商业套餐定义', path: '/finance/package/list', icon: 'Box' },
      { id: 'quota', label: '订单结算管理', path: '/finance/quota/list', icon: 'PieChart' },
      {
        id: 'billing-logs',
        label: '额度流水管理',
        path: '/finance/quota/billing',
        icon: 'Document'
      }
    ]
  },
  {
    title: '安全防护',
    icon: 'Lock',
    children: [
      { id: 'risk-rules', label: '风控拦截引擎', path: '/risk/rules', icon: 'Warning' },
      { id: 'intercept', label: '安全日志审计', path: '/risk/logs', icon: 'Document' }
    ]
  },
  {
    title: '资源库',
    icon: 'Folder',
    children: [
      {
        id: 'system-prompt-list',
        label: '系统提示词库',
        path: '/prompt/system-prompt-list',
        icon: 'Folder'
      },
      {
        id: 'user-prompt-list',
        label: '用户提示词库',
        path: '/prompt/user-prompt-list',
        icon: 'Document'
      },
      {
        id: 'prompt-category',
        label: '提示词分类管理',
        path: '/prompt/prompt-category',
        icon: 'FolderOpened'
      },
      {
        id: 'style-library',
        label: '风格库',
        path: '/resource/style-library',
        icon: 'Brush'
      },
      {
        id: 'camera-movement-library',
        label: '运镜库',
        path: '/resource/camera-movement-library',
        icon: 'VideoCamera'
      },
      {
        id: 'voice-profiles',
        label: '音色库',
        path: '/voice/profiles',
        icon: 'Microphone'
      }
    ]
  },
  {
    title: '授权管理',
    icon: 'Key',
    children: [
      { id: 'authorization-list', label: '授权记录', path: '/authorization/list', icon: 'Key' },
      {
        id: 'authorization-stats',
        label: '授权统计',
        path: '/authorization/stats',
        icon: 'DataAnalysis'
      }
    ]
  },
  {
    title: '日志审计',
    icon: 'Document',
    children: [
      { id: 'operation-logs', label: '操作日志', path: '/log/operation', icon: 'Document' },
      { id: 'ai-call-logs', label: 'AI调用日志', path: '/log/ai-call', icon: 'ChatLineRound' }
    ]
  }
]

export const MENU_STRUCTURE = withPermissions(RAW_MENU_STRUCTURE)

export function buildPathPermissionMap() {
  const map = {}
  MENU_STRUCTURE.forEach(group => {
    group.children.forEach(child => {
      if (child.path && child.permission) {
        map[child.path] = child.permission
      }
    })
  })
  return map
}

export const PATH_PERMISSION_MAP = buildPathPermissionMap()

// 顶部导航菜单
export const TOP_NAV_MENU = [
  { label: '总览', path: '/dashboard', permission: menuKeyToViewPermission('dashboard') },
  { label: '授权', path: '/authorization/list', permission: menuKeyToViewPermission('authorization-list') }
]
