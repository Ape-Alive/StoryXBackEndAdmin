const userEntitlementService = require('../services/userEntitlement.service')
const { NoEntitlementError } = require('../utils/errors')

const ENTITLEMENT_EXEMPT_PREFIXES = [
  '/available',
  '/subscribe',
  '/my-packages',
]

function isEntitlementExemptPath(path) {
  return ENTITLEMENT_EXEMPT_PREFIXES.some(prefix => path.startsWith(prefix))
}

async function attachEntitlement(req, res, next) {
  if (!req.user || req.user.type !== 'user') {
    return next()
  }

  try {
    req.entitlement = await userEntitlementService.computeForUser(req.user.id)
    return next()
  } catch (error) {
    return next(error)
  }
}

async function requireEntitlement(req, res, next) {
  if (!req.user || req.user.type !== 'user') {
    return next()
  }

  if (isEntitlementExemptPath(req.path)) {
    return next()
  }

  try {
    const entitlement = req.entitlement || (await userEntitlementService.computeForUser(req.user.id))
    req.entitlement = entitlement

    if (!entitlement.hasAccess) {
      throw new NoEntitlementError(entitlement.message, entitlement.subscriptionGuide)
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  attachEntitlement,
  requireEntitlement,
  isEntitlementExemptPath,
}
