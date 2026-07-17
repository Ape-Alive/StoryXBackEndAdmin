const userEntitlementService = require('../services/userEntitlement.service')
const { ForbiddenError } = require('../utils/errors')

async function checkClientPermissions(req, requiredCodes) {
  if (!requiredCodes.length) {
    return true
  }

  const entitlement =
    req.entitlement || (await userEntitlementService.computeForUser(req.user.id))
  req.entitlement = entitlement

  if (!entitlement.hasAccess) {
    const { NoEntitlementError } = require('../utils/errors')
    throw new NoEntitlementError(entitlement.message, entitlement.subscriptionGuide)
  }

  const granted = [
    ...(entitlement.menuPermissionCodes || []),
    ...(entitlement.buttonPermissionCodes || []),
  ]
  return requiredCodes.some(code => granted.includes(code))
}

function requireClientPermission(...permissionCodes) {
  const requiredCodes = permissionCodes.filter(Boolean)

  return async (req, res, next) => {
    try {
      if (!req.user || req.user.type !== 'user') {
        return next()
      }

      const allowed = await checkClientPermissions(req, requiredCodes)
      if (!allowed) {
        return next(new ForbiddenError('Client permission denied'))
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

function requireAnyClientPermission(...permissionCodes) {
  return requireClientPermission(...permissionCodes)
}

module.exports = {
  requireClientPermission,
  requireAnyClientPermission,
}
