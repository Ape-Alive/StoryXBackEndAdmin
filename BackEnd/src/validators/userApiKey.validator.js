const { body } = require('express-validator');

/**
 * 用户创建API Key验证规则
 */
const createUserApiKeyValidator = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
  body('expireTime')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid expireTime format');
        }
        return true;
      }
      if (typeof value === 'number') {
        if (value < 0) {
          throw new Error('expireTime must be a positive number or 0');
        }
        return true;
      }
      throw new Error('expireTime must be a string (ISO date) or number (timestamp)');
    })
];

/**
 * 管理员添加提供商API Key验证规则
 */
const addProviderApiKeyValidator = [
  body('apiKey')
    .notEmpty()
    .withMessage('API Key is required')
    .isString()
    .withMessage('API Key must be a string'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
  body('apiKeyId')
    .optional({ nullable: true, checkFalsy: true })
    .if((value) => value !== null && value !== undefined && value !== '')
    .isString()
    .withMessage('API Key ID must be a string'),
  body('credits')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Credits must be a non-negative number'),
  body('expireTime')
    .optional({ nullable: true })
    .custom((value) => {
      // 如果值为 null、undefined 或 0，表示永不过期，允许通过
      if (value === null || value === undefined || value === 0 || value === '0') {
        return true;
      }
      if (typeof value === 'string') {
        // 空字符串表示永不过期
        if (value.trim() === '') {
          return true;
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid expireTime format');
        }
        return true;
      }
      if (typeof value === 'number') {
        if (value < 0) {
          throw new Error('expireTime must be a positive number or 0');
        }
        return true;
      }
      throw new Error('expireTime must be a string (ISO date) or number (timestamp)');
    })
];

module.exports = {
  createUserApiKeyValidator,
  addProviderApiKeyValidator
};
