const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * 请求验证中间件
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    // 输出详细的验证错误信息，便于调试
    console.log('Validation errors:', JSON.stringify(formattedErrors, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    return next(new ValidationError('Validation failed', formattedErrors));
  }

  next();
};

module.exports = validate;
