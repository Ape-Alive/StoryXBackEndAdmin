import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Index.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'model/provider',
        name: 'Provider',
        component: () => import('@/views/model/Provider.vue'),
        meta: { title: '提供商配置' }
      }
    ]
  },
  {
    path: "/model",
    name: "Model",
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { title: '模型管理', requiresAuth: true },
    children: [
      {
        path: '/model/provider',
        name: 'Provider',
        component: () => import('@/views/model/Provider.vue'),
        meta: { title: '提供商管理', requiresAuth: true }
      },
      {
        path: '/model/list',
        name: 'ModelList',
        component: () => import('@/views/model/List.vue'),
        meta: { title: '模型列表', requiresAuth: true }
      },
      {
        path: '/model/pricing',
        name: 'ModelPricing',
        component: () => import('@/views/model/Pricing.vue'),
        meta: { title: '模型计费策略', requiresAuth: true }
      }
    ],

  },
  {
    path: "/system-user",
    name: "SystemUser",
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { title: '系统用户管理', requiresAuth: true },
    children: [
      {
        path: '/system-user/list',
        name: 'SystemUserList',
        component: () => import('@/views/systemUser/SystemUserList.vue'),
        meta: { title: '系统用户列表', requiresAuth: true }
      },
      {
        path: '/system-user/status',
        name: 'SystemUserStatus',
        component: () => import('@/views/systemUser/SystemUserStatus.vue'),
        meta: { title: '权限状态管控', requiresAuth: true }
      }
    ]
  },
  {
    path: "/terminal-user",
    name: "TerminalUser",
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { title: '终端用户管理', requiresAuth: true },
    children: [
      {
        path: '/terminal-user/list',
        name: 'TerminalUserList',
        component: () => import('@/views/terminalUser/TerminalUserList.vue'),
        meta: { title: '终端用户列表', requiresAuth: true }
      },
      {
        path: '/terminal-user/device',
        name: 'TerminalUserDevice',
        component: () => import('@/views/terminalUser/TerminalUserDevice.vue'),
        meta: { title: '安全设备管理', requiresAuth: true }
      },
      {
        path: '/terminal-user/package',
        name: 'TerminalUserPackage',
        component: () => import('@/views/terminalUser/TerminalUserPackage.vue'),
        meta: { title: '用户套餐管理', requiresAuth: true }
      },
      {
        path: '/terminal-user/quota',
        name: 'TerminalUserQuota',
        component: () => import('@/views/terminalUser/TerminalUserQuota.vue'),
        meta: { title: '用户额度管理', requiresAuth: true }
      }
    ]
  },
  {
    path: "/finance",
    name: "Finance",
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { title: '财务治理', requiresAuth: true },
    children: [
      {
        path: '/finance/package/list',
        name: 'FinancePackageList',
        component: () => import('@/views/finance/FinancePackageList.vue'),
        meta: { title: '商业套餐定义', requiresAuth: true }
      },
      {
        path: '/finance/quota/list',
        name: 'FinanceQuotaList',
        component: () => import('@/views/finance/FinanceQuotaList.vue'),
        meta: { title: '订单结算管理', requiresAuth: true }
      },
      {
        path: '/finance/quota/billing',
        name: 'FinanceQuotaBilling',
        component: () => import('@/views/finance/FinanceQuotaBilling.vue'),
        meta: { title: '额度流水管理', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ path: '/' })
  } else {
    next()
  }
})

export default router

