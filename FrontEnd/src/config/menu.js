/**
 * 菜单配置
 * 参考 React 版本的菜单结构
 */

export const MENU_STRUCTURE = [
    {
        title: '指挥中心',
        icon: 'Odometer',
        children: [
            { id: 'dashboard', label: '运行总览大屏', path: '/dashboard', icon: 'Odometer' },
            { id: 'statistics', label: '调用数据分析', path: '/dashboard/statistics', icon: 'DataAnalysis' }
        ]
    },
    {
        title: '系统用户管理',
        icon: 'User',
        children: [
            { id: 'system-user-list', label: '系统用户列表', path: '/system-user/list', icon: 'User' },
            { id: 'system-user-status', label: '权限状态管控', path: '/system-user/status', icon: 'Lock' },
        ]
    },
    {
        title: '终端用户管理',
        icon: 'User',
        children: [
            { id: 'terminal-user-list', label: '终端用户列表', path: '/terminal-user/list', icon: 'User' },
            { id: 'device-manage', label: '安全设备管理', path: '/terminal-user/device', icon: 'Monitor' },
            { id: 'user-package', label: '用户套餐管理', path: '/terminal-user/package', icon: 'Box' },
            { id: 'user-quota', label: '用户额度管理', path: '/terminal-user/quota', icon: 'PieChart' }
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
            { id: 'billing-logs', label: '额度流水管理', path: '/finance/quota/billing', icon: 'Document' }
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
        title: '提示词库',
        icon: 'Document',
        children: [
            { id: 'prompt-category', label: '系统提示词库', path: '/system-prompt/category', icon: 'Folder' },
            { id: 'prompt-list', label: '用户提示词库', path: '/user-prompt/list', icon: 'Document' }
        ]
    },
    {
        title: '授权管理',
        icon: 'Key',
        children: [
            { id: 'authorization-list', label: '授权记录', path: '/authorization/list', icon: 'Key' },
            { id: 'authorization-stats', label: '授权统计', path: '/authorization/stats', icon: 'DataAnalysis' }
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

// 顶部导航菜单
export const TOP_NAV_MENU = [
    { label: '概览', path: '/dashboard' },
    { label: '监控', path: '/monitor' },
    { label: '路由', path: '/route' },
    { label: '审计', path: '/audit' }
]

