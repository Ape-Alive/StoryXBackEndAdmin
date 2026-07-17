const userEntitlementService = require('../services/userEntitlement.service')
const { BadRequestError, ForbiddenError } = require('./errors')

/**
 * 终端用户拉 catalog 时解析角色上下文。
 * 要求 query/body 带 userId，且必须与登录用户一致。
 * 管理员返回 null（不过滤）。
 */
async function resolveCatalogRoleContext(req) {
  if (req.user?.type !== 'user') {
    return null
  }

  const authUserId = String(req.user.id)
  const requested =
    req.query?.userId != null && req.query.userId !== ''
      ? String(req.query.userId)
      : req.body?.userId != null && req.body.userId !== ''
        ? String(req.body.userId)
        : null

  if (!requested) {
    throw new BadRequestError('userId is required for catalog access')
  }
  if (requested !== authUserId) {
    throw new ForbiddenError('userId does not match authenticated user')
  }

  return {
    userId: authUserId,
    effectiveRoleId: await userEntitlementService.getEffectiveClientRoleId(authUserId),
  }
}

module.exports = {
  resolveCatalogRoleContext,
}
