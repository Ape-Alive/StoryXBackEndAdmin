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

  }]

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

