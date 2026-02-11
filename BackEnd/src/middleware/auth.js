const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

/**
 * JWT 认证中间件
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 将用户信息附加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      // Token过期，返回更详细的错误信息
      const expiredAt = error.expiredAt ? new Date(error.expiredAt * 1000).toISOString() : null;
      const message = expiredAt 
        ? `Token expired at ${expiredAt}. Please login again to get a new token.`
        : 'Token expired. Please login again to get a new token.';
      const expiredError = new UnauthorizedError(message);
      expiredError.expiredAt = expiredAt;
      next(expiredError);
    } else {
      next(error);
    }
  }
};

/**
 * 权限检查中间件
 * @param {Array} roles - 允许的角色列表
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
