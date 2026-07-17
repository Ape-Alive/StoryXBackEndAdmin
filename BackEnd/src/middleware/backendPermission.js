const backendRoleService = require('../services/backendRole.service')
const { ForbiddenError, UnauthorizedError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')

async function loadBackendPermissions(req) {
  if (req.backendPermissions) {
    return req.backendPermissions
  }

  const codes = await backendRoleService.getBackendPermissionCodesByRoleKey(req.user.role)
  req.backendPermissions = [
    ...codes.menuPermissionCodes,
    ...codes.buttonPermissionCodes,
  ]
  return req.backendPermissions
}

function buildMenuPermissionCodes(menuKey, method) {
  const base = `BACKEND_MENU_${String(menuKey).replace(/-/g, '_').toUpperCase()}`
  if (method === 'GET' || method === 'HEAD') {
    return [`${base}_VIEW`, `${base}_MANAGE`]
  }
  return [`${base}_MANAGE`]
}

function requireBackendPermission(...permissionCodes) {
  const requiredCodes = permissionCodes.filter(Boolean)

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('User not authenticated'))
      }

      if (req.user.type === 'user') {
        return next()
      }

      if (req.user.role === ROLES.SUPER_ADMIN) {
        return next()
      }

      if (!requiredCodes.length) {
        return next()
      }

      const granted = await loadBackendPermissions(req)
      const allowed = requiredCodes.some(code => granted.includes(code))
      if (!allowed) {
        return next(new ForbiddenError('Permission denied'))
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

function requireBackendMenuPermission(menuKey) {
  return (req, res, next) => {
    const codes = buildMenuPermissionCodes(menuKey, req.method)
    return requireBackendPermission(...codes)(req, res, next)
  }
}

function requireAnyBackendMenuPermission(...menuKeys) {
  return (req, res, next) => {
    const codes = menuKeys.flatMap(key => buildMenuPermissionCodes(key, req.method))
    return requireBackendPermission(...codes)(req, res, next)
  }
}

module.exports = {
  requireBackendPermission,
  requireBackendMenuPermission,
  requireAnyBackendMenuPermission,
  loadBackendPermissions,
  buildMenuPermissionCodes,
}
