import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getCurrentAdmin } from '@/api/auth'
import { setToken, removeToken } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const admin = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  // 登录
  async function loginAction(loginData) {
    try {
      const response = await login(loginData)
      if (response.success && response.data.token) {
        token.value = response.data.token
        setToken(response.data.token)
        admin.value = response.data.admin
        return { success: true }
      }
      return { success: false, message: response.message || '登录失败' }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || '登录失败'
      }
    }
  }

  // 获取当前管理员信息
  async function fetchCurrentAdmin() {
    try {
      const response = await getCurrentAdmin()
      if (response.success && response.data) {
        admin.value = response.data
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      return { success: false }
    }
  }

  // 登出
  function logout() {
    token.value = ''
    admin.value = null
    removeToken()
  }

  return {
    token,
    admin,
    isAuthenticated,
    loginAction,
    fetchCurrentAdmin,
    logout
  }
})

