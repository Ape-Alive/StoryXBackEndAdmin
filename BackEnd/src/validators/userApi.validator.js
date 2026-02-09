const { body, query, param } = require('express-validator');

/**
 * 申请调用授权验证
 */
const requestAuthorizationValidator = [
  body('modelId')
    .notEmpty()
    .withMessage('Model ID is required')
    .isString()
    .withMessage('Model ID must be a string'),
  body('deviceFingerprint')
    .notEmpty()
    .withMessage('Device fingerprint is required')
    .isString()
    .withMessage('Device fingerprint must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Device fingerprint must be between 1 and 255 characters'),
  body('estimatedTokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estimated tokens must be a non-negative integer')
];

/**
 * 上报调用结果验证
 */
const reportCallValidator = [
  body('callToken')
    .notEmpty()
    .withMessage('Call token is required')
    .isString()
    .withMessage('Call token must be a string'),
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isString()
    .withMessage('Request ID must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Request ID must be between 1 and 255 characters'),
  body('inputTokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Input tokens must be a non-negative integer'),
  body('outputTokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Output tokens must be a non-negative integer'),
  body('totalTokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total tokens must be a non-negative integer'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['success', 'failed', 'timeout', 'error'])
    .withMessage('Status must be one of: success, failed, timeout, error'),
  body('errorMessage')
    .optional()
    .isString()
    .withMessage('Error message must be a string'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('responseTime')
    .optional()
    .isISO8601()
    .withMessage('Response time must be a valid ISO 8601 date string')
];

/**
 * 获取我的授权列表验证
 */
const getMyAuthorizationsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('modelId')
    .optional()
    .isString()
    .withMessage('Model ID must be a string'),
  query('status')
    .optional()
    .isIn(['active', 'used', 'expired', 'revoked'])
    .withMessage('Status must be one of: active, used, expired, revoked'),
  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('Active only must be a boolean')
];

/**
 * 获取调用日志列表验证
 */
const getCallLogsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('modelId')
    .optional()
    .isString()
    .withMessage('Model ID must be a string'),
  query('status')
    .optional()
    .isIn(['success', 'failed', 'timeout', 'error'])
    .withMessage('Status must be one of: success, failed, timeout, error'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date string'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date string')
];

/**
 * 获取调用日志详情验证
 */
const getCallLogDetailValidator = [
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isString()
    .withMessage('Request ID must be a string')
];

/**
 * 取消授权验证
 */
const cancelAuthorizationValidator = [
  param('id')
    .notEmpty()
    .withMessage('Authorization ID is required')
    .isString()
    .withMessage('Authorization ID must be a string')
];

module.exports = {
  requestAuthorizationValidator,
  reportCallValidator,
  getMyAuthorizationsValidator,
  getCallLogsValidator,
  getCallLogDetailValidator,
  cancelAuthorizationValidator
};
