const { query, param } = require('express-validator');

/**
 * 获取授权记录列表验证
 */
const getAuthorizationsValidator = [
  query('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  query('modelId')
    .optional()
    .isString()
    .withMessage('Model ID must be a string'),
  query('callToken')
    .optional()
    .isString()
    .withMessage('Call token must be a string'),
  query('status')
    .optional()
    .isIn(['active', 'revoked', 'expired', 'used'])
    .withMessage('Status must be one of: active, revoked, expired, used'),
  query('requestId')
    .optional()
    .isString()
    .withMessage('Request ID must be a string'),
  query('activeOnly')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Active only must be true or false'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
];

/**
 * 获取授权记录详情验证
 */
const getAuthorizationDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Authorization ID is required')
    .isString()
    .withMessage('Authorization ID must be a string')
];

/**
 * 根据 callToken 获取授权记录验证
 */
const getByCallTokenValidator = [
  param('callToken')
    .notEmpty()
    .withMessage('Call token is required')
    .isString()
    .withMessage('Call token must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Call token must be between 1 and 255 characters')
];

/**
 * 撤销授权验证
 */
const revokeAuthorizationValidator = [
  param('id')
    .notEmpty()
    .withMessage('Authorization ID is required')
    .isString()
    .withMessage('Authorization ID must be a string')
];

/**
 * 获取用户授权统计验证
 */
const getUserAuthorizationStatsValidator = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
];

/**
 * 获取全部用户授权统计验证（看板筛选参数可选）
 */
const getAllUsersAuthorizationStatsValidator = [
  query('deviceFingerprint')
    .optional()
    .isString()
    .withMessage('Device fingerprint must be a string'),
  query('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  query('status')
    .optional()
    .isIn(['active', 'revoked', 'expired', 'used'])
    .withMessage('Status must be one of: active, revoked, expired, used'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

module.exports = {
  getAuthorizationsValidator,
  getAuthorizationDetailValidator,
  getByCallTokenValidator,
  revokeAuthorizationValidator,
  getUserAuthorizationStatsValidator,
  getAllUsersAuthorizationStatsValidator
};
