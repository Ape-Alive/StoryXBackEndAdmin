import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getCurrentAdmin } from '@/api/auth'
import { getToken, setToken, removeToken, getAdmin, setAdmin, removeAdmin } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  // 从 localStorage 恢复 token 和 admin 信息
  const token = ref(getToken() || '')
  const admin = ref(getAdmin() || null)

  const isAuthenticated = computed(() => !!token.value)

  // user 别名，指向 admin（为了兼容性）
  const user = computed(() => admin.value)

  // 登录
  async function loginAction(loginData) {
    try {
      const response = await login(loginData)
      if (response.success && response.data.token) {
        token.value = response.data.token
        setToken(response.data.token)
        admin.value = response.data.admin
        // 保存管理员信息到 localStorage
        if (response.data.admin) {
          setAdmin(response.data.admin)
        }
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
        // 更新 localStorage 中的管理员信息
        setAdmin(response.data)
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
    removeAdmin()
  }

  return {
    token,
    admin,
    user,
    isAuthenticated,
    loginAction,
    fetchCurrentAdmin,
    logout
  }
})
