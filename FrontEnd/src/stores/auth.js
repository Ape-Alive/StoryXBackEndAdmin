import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getCurrentAdmin, getMyPermissions } from '@/api/auth'
import { getToken, setToken, removeToken, getAdmin, setAdmin, removeAdmin } from '@/utils/auth'
import { setAdminPermissions, clearAdminPermissions } from '@/utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken() || '')
  const admin = ref(getAdmin() || null)
  const permissionsLoaded = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const user = computed(() => admin.value)

  async function loadPermissions() {
    if (!token.value) {
      permissionsLoaded.value = false
      return { success: false }
    }

    try {
      const response = await getMyPermissions()
      if (response.success && response.data) {
        setAdminPermissions(response.data)
        permissionsLoaded.value = true
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      return { success: false }
    }
  }

  async function ensurePermissions(force = false) {
    if (!token.value) return { success: false }
    if (!force && permissionsLoaded.value) return { success: true }
    return loadPermissions()
  }

  async function loginAction(loginData) {
    try {
      const response = await login(loginData)
      if (response.success && response.data.token) {
        token.value = response.data.token
        setToken(response.data.token)
        admin.value = response.data.admin
        if (response.data.admin) {
          setAdmin(response.data.admin)
        }
        await loadPermissions()
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

  async function fetchCurrentAdmin() {
    try {
      const response = await getCurrentAdmin()
      if (response.success && response.data) {
        admin.value = response.data
        setAdmin(response.data)
        await loadPermissions()
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      return { success: false }
    }
  }

  function logout() {
    token.value = ''
    admin.value = null
    permissionsLoaded.value = false
    removeToken()
    removeAdmin()
    clearAdminPermissions()
  }

  return {
    token,
    admin,
    user,
    isAuthenticated,
    permissionsLoaded,
    loginAction,
    fetchCurrentAdmin,
    loadPermissions,
    ensurePermissions,
    logout
  }
})
