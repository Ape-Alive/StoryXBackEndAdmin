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

/**
 * 批量更新用户状态验证
 */
const batchUpdateStatusValidator = [
  body('ids')
    .notEmpty()
    .withMessage('IDs are required')
    .isArray({ min: 1 })
    .withMessage('IDs must be a non-empty array'),
  body('ids.*')
    .isString()
    .withMessage('Each ID must be a string'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
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
 * 批量解绑设备验证
 */
const batchUnbindDevicesValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('deviceIds')
    .notEmpty()
    .withMessage('Device IDs are required')
    .isArray({ min: 1 })
    .withMessage('Device IDs must be a non-empty array'),
  body('deviceIds.*')
    .isString()
    .withMessage('Each device ID must be a string')
];

/**
 * 更新用户信息验证
 */
const updateUserValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('phone')
    .optional()
    .isString()
    .withMessage('Phone must be a string'),
  body('role')
    .optional()
    .isIn(['basic_user', 'user'])
    .withMessage('Invalid role')
];

/**
 * 批量删除用户验证
 */
const batchDeleteUsersValidator = [
  body('ids')
    .notEmpty()
    .withMessage('IDs are required')
    .isArray({ min: 1 })
    .withMessage('IDs must be a non-empty array'),
  body('ids.*')
    .isString()
    .withMessage('Each ID must be a string')
];

module.exports = {
  getUsersValidator,
  updateUserStatusValidator,
  getUserDetailValidator,
  unbindDeviceValidator,
  batchUpdateStatusValidator,
  batchUnbindDevicesValidator,
  updateUserValidator,
  batchDeleteUsersValidator
};
