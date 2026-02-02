import { setLocalStorage, getLocalStorage, removeLocalStorage } from './storage'

const TOKEN_KEY = 'token'
const ADMIN_KEY = 'admin' // 管理员信息存储键

/**
 * Token 操作
 */
export function getToken() {
  return getLocalStorage(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) // 兼容旧版本
}

export function setToken(token) {
  setLocalStorage(TOKEN_KEY, token)
}

export function removeToken() {
  removeLocalStorage(TOKEN_KEY)
}

/**
 * 管理员信息操作
 */
export function getAdmin() {
  return getLocalStorage(ADMIN_KEY)
}

export function setAdmin(admin) {
  setLocalStorage(ADMIN_KEY, admin)
}

export function removeAdmin() {
  removeLocalStorage(ADMIN_KEY)
}

