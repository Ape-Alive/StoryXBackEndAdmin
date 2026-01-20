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
      next(new UnauthorizedError('Token expired'));
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
