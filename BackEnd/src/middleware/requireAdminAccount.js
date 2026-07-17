const { ForbiddenError, UnauthorizedError } = require('../utils/errors')

/**
 * 仅允许管理员 JWT（终端用户 token 带 type=user，必须拒绝）
 */
function requireAdminAccount(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'))
  }
  if (req.user.type === 'user') {
    return next(new ForbiddenError('Admin access required'))
  }
  return next()
}

module.exports = { requireAdminAccount }
