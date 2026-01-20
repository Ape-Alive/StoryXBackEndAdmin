const { body, query, param } = require('express-validator');

/**
 * 用户列表查询验证
 */
const getUsersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  query('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  query('status')
    .optional()
    .isIn(['normal', 'frozen', 'banned'])
    .withMessage('Invalid status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

/**
 * 更新用户状态验证
 */
const updateUserStatusValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('status')
    .isIn(['normal', 'frozen', 'banned'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string'),
  body('banDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ban duration must be a positive integer')
];

/**
 * 获取用户详情验证
 */
const getUserDetailValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
];

/**
 * 强制解绑设备验证
 */
const unbindDeviceValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
];

module.exports = {
  getUsersValidator,
  updateUserStatusValidator,
  getUserDetailValidator,
  unbindDeviceValidator
};
