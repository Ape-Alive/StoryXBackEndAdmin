const { body, query, param } = require('express-validator');

/**
 * 设备列表查询验证（管理员）
 */
const getDevicesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('deviceId')
    .optional()
    .isString()
    .withMessage('Device ID must be a string'),
  query('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  query('deviceFingerprint')
    .optional()
    .isString()
    .withMessage('Device fingerprint must be a string'),
  query('status')
    .optional()
    .isIn(['active', 'revoked'])
    .withMessage('Invalid status'),
  query('ipAddress')
    .optional()
    .isString()
    .withMessage('IP address must be a string'),
  query('lastUsedStart')
    .optional()
    .isISO8601()
    .withMessage('Invalid last used start date format'),
  query('lastUsedEnd')
    .optional()
    .isISO8601()
    .withMessage('Invalid last used end date format'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('orderBy')
    .optional()
    .isIn(['createdAt', 'lastUsedAt'])
    .withMessage('Invalid orderBy field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid order')
];

/**
 * 用户设备列表查询验证（终端用户）
 */
const getUserDevicesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('status')
    .optional()
    .isIn(['active', 'revoked'])
    .withMessage('Invalid status')
];

/**
 * 获取设备详情验证
 */
const getDeviceDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Device ID is required')
];

/**
 * 更新设备信息验证（终端用户）
 */
const updateDeviceValidator = [
  param('id')
    .notEmpty()
    .withMessage('Device ID is required'),
  body('name')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Device name must be a string with max 50 characters'),
  body('remark')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Remark must be a string with max 200 characters')
];

/**
 * 更新设备信息验证（管理员）
 */
const updateDeviceByAdminValidator = [
  param('id')
    .notEmpty()
    .withMessage('Device ID is required'),
  body('name')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Device name must be a string with max 50 characters'),
  body('remark')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Remark must be a string with max 200 characters'),
  body('status')
    .optional()
    .isIn(['active', 'revoked'])
    .withMessage('Invalid status')
];

/**
 * 解绑设备验证（终端用户）
 */
const revokeDeviceValidator = [
  param('id')
    .notEmpty()
    .withMessage('Device ID is required')
];

/**
 * 批量更新状态验证（管理员）
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
    .isIn(['active', 'revoked'])
    .withMessage('Invalid status')
];

/**
 * 批量删除验证（管理员）
 */
const batchDeleteValidator = [
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
  getDevicesValidator,
  getUserDevicesValidator,
  getDeviceDetailValidator,
  updateDeviceValidator,
  updateDeviceByAdminValidator,
  revokeDeviceValidator,
  batchUpdateStatusValidator,
  batchDeleteValidator
};

