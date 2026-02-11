const logger = require('../utils/logger');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // 默认错误信息
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // 验证错误（express-validator）
  if (err.name === 'ValidationError' || err.errors) {
    statusCode = 400;
    message = err.message || 'Validation Error';
    if (err.errors && Array.isArray(err.errors)) {
      errors = err.errors;
    }
  }

  // 自定义错误类
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // Token过期错误处理
  let expiredAt = null;
  if (err.name === 'TokenExpiredError' || (err.statusCode === 401 && err.message && err.message.includes('Token expired'))) {
    statusCode = 401;
    message = err.message || 'Token expired';
    // 如果错误对象包含过期时间，保存到变量中
    if (err.expiredAt) {
      expiredAt = err.expiredAt;
    }
  }

  // 开发环境返回详细错误信息
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(expiredAt && { expiredAt }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
