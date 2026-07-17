const { UnauthorizedError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')

function requireTerminalUser(req, res, next) {
  if (!req.user || req.user.type !== 'user') {
    return next(new UnauthorizedError('Terminal user authentication required'))
  }

  if (![ROLES.USER, ROLES.BASIC_USER].includes(req.user.role)) {
    return next(new UnauthorizedError('Insufficient permissions'))
  }

  return next()
}

module.exports = {
  requireTerminalUser,
}
