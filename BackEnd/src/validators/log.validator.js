const { query, param } = require('express-validator');

/**
 * 获取管理员操作日志列表验证
 */
const getOperationLogsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('pageSize must be between 1 and 100'),
  query('adminId')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('adminId must be a string up to 64 characters'),
  query('action')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('action must be a string up to 64 characters'),
  query('targetType')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('targetType must be a string up to 64 characters'),
  query('targetId')
    .optional()
    .isString()
    .isLength({ max: 128 })
    .withMessage('targetId must be a string up to 128 characters'),
  query('result')
    .optional()
    .isIn(['success', 'failure'])
    .withMessage('result must be success or failure'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be valid ISO 8601 date')
];

/**
 * 获取操作日志详情验证
 */
const getOperationLogDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Log ID is required')
    .isString()
    .isLength({ min: 1, max: 64 })
    .withMessage('Log ID must be a valid string')
];

/**
 * 获取 AI 调用日志列表验证
 */
const getAICallLogsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('pageSize must be between 1 and 100'),
  query('userId')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('userId must be a string up to 64 characters'),
  query('modelId')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('modelId must be a string up to 64 characters'),
  query('status')
    .optional()
    .isIn(['success', 'failure'])
    .withMessage('status must be success or failure'),
  query('requestId')
    .optional()
    .isString()
    .isLength({ max: 128 })
    .withMessage('requestId must be a string up to 128 characters'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be valid ISO 8601 date')
];

/**
 * 获取 AI 调用日志详情验证
 */
const getAICallLogDetailValidator = [
  param('requestId')
    .notEmpty()
    .withMessage('requestId is required')
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage('requestId must be a valid string')
];

module.exports = {
  getOperationLogsValidator,
  getOperationLogDetailValidator,
  getAICallLogsValidator,
  getAICallLogDetailValidator
};
