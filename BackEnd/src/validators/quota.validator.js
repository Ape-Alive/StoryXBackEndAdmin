const { body, param, query } = require('express-validator');

// 冻结额度验证
const freezeQuotaValidator = [
  param('id')
    .notEmpty()
    .withMessage('Quota ID is required')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 解冻额度验证
const unfreezeQuotaValidator = [
  param('id')
    .notEmpty()
    .withMessage('Quota ID is required')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 设置额度验证
const setQuotaValidator = [
  param('id')
    .notEmpty()
    .withMessage('Quota ID is required')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('available')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Available quota must be a non-negative number'),
  body('frozen')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Frozen quota must be a non-negative number'),
  body('used')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Used quota must be a non-negative number'),
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 重置额度验证
const resetQuotaValidator = [
  param('id')
    .notEmpty()
    .withMessage('Quota ID is required')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 批量调整额度验证
const batchAdjustQuotaValidator = [
  body('items')
    .notEmpty()
    .withMessage('Items array is required')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.quotaId')
    .notEmpty()
    .withMessage('Quota ID is required for each item')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('items.*.amount')
    .notEmpty()
    .withMessage('Amount is required for each item')
    .isFloat()
    .withMessage('Amount must be a number'),
  body('items.*.reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 批量冻结额度验证
const batchFreezeQuotaValidator = [
  body('items')
    .notEmpty()
    .withMessage('Items array is required')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.quotaId')
    .notEmpty()
    .withMessage('Quota ID is required for each item')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('items.*.amount')
    .notEmpty()
    .withMessage('Amount is required for each item')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('items.*.reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 批量解冻额度验证
const batchUnfreezeQuotaValidator = [
  body('items')
    .notEmpty()
    .withMessage('Items array is required')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.quotaId')
    .notEmpty()
    .withMessage('Quota ID is required for each item')
    .isString()
    .withMessage('Quota ID must be a string'),
  body('items.*.amount')
    .notEmpty()
    .withMessage('Amount is required for each item')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('items.*.reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// 导出额度验证
const exportQuotasValidator = [
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  body('packageId')
    .optional()
    .isString()
    .withMessage('Package ID must be a string'),
  body('format')
    .optional()
    .isIn(['excel', 'csv'])
    .withMessage('Format must be excel or csv')
];

// 统计信息验证
const getQuotaStatisticsValidator = [
  query('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  query('packageId')
    .optional()
    .isString()
    .withMessage('Package ID must be a string')
];

module.exports = {
  freezeQuotaValidator,
  unfreezeQuotaValidator,
  setQuotaValidator,
  resetQuotaValidator,
  batchAdjustQuotaValidator,
  batchFreezeQuotaValidator,
  batchUnfreezeQuotaValidator,
  exportQuotasValidator,
  getQuotaStatisticsValidator
};
