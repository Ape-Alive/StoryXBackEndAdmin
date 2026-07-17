import { getLocalStorage, removeLocalStorage, setLocalStorage } from './storage'
import { getAdmin } from './auth'
import { PATH_PERMISSION_MAP, menuKeyToViewPermission, menuKeyToManagePermission } from '@/config/menu'

const PERMISSIONS_KEY = 'admin_permissions'

const EMPTY_PERMISSIONS = {
  menuPermissionCodes: [],
  buttonPermissionCodes: [],
}

export function setAdminPermissions(permissions) {
  setLocalStorage(PERMISSIONS_KEY, {
    menuPermissionCodes: permissions?.menuPermissionCodes || [],
    buttonPermissionCodes: permissions?.buttonPermissionCodes || [],
  })
}

export function getAdminPermissions() {
  return getLocalStorage(PERMISSIONS_KEY, EMPTY_PERMISSIONS)
}

export function clearAdminPermissions() {
  removeLocalStorage(PERMISSIONS_KEY)
}

export function isSuperAdminUser() {
  const admin = getAdmin()
  return admin?.role === 'super_admin'
}

export function hasMenuPermission(code) {
  if (!code) return true
  if (isSuperAdminUser()) return true
  const { menuPermissionCodes } = getAdminPermissions()
  return menuPermissionCodes.includes(code)
}

export function hasButtonPermission(code) {
  if (!code) return true
  if (isSuperAdminUser()) return true
  const { buttonPermissionCodes } = getAdminPermissions()
  return buttonPermissionCodes.includes(code)
}

export function hasAnyMenuPermission(codes = []) {
  if (!codes.length) return true
  return codes.some(code => hasMenuPermission(code))
}

export function hasAnyButtonPermission(codes = []) {
  if (!codes.length) return true
  return codes.some(code => hasButtonPermission(code))
}

export function resolveRoutePermission(path) {
  if (!path) return null
  if (PATH_PERMISSION_MAP[path]) {
    return PATH_PERMISSION_MAP[path]
  }
  const entries = Object.entries(PATH_PERMISSION_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, permission] of entries) {
    if (path.startsWith(prefix)) {
      return permission
    }
  }
  return null
}

export { menuKeyToViewPermission, menuKeyToManagePermission }
