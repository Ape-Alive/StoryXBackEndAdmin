const { body, query, param } = require('express-validator');

/**
 * 提供商列表查询验证
 */
const getProvidersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
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
 * 创建提供商验证
 */
const createProviderValidator = [
  body('name')
    .notEmpty()
    .withMessage('Provider name is required')
    .isString()
    .withMessage('Provider name must be a string')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Provider name can only contain letters, numbers, underscores, dots, and hyphens'),
  body('displayName')
    .notEmpty()
    .withMessage('Display name is required')
    .isString()
    .withMessage('Display name must be a string'),
  body('baseUrl')
    .notEmpty()
    .withMessage('Base URL is required')
    .isURL()
    .withMessage('Invalid URL format'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL format'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('Invalid logo URL format'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('quota')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quota must be a non-negative number'),
  body('quotaUnit')
    .optional()
    .isIn(['points'])
    .withMessage('Quota unit must be points (积分)'),
  body('supportsApiKeyCreation')
    .optional()
    .isBoolean()
    .withMessage('supportsApiKeyCreation must be a boolean'),
  body('mainAccountToken')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      // 如果支持API Key创建，则mainAccountToken必填
      if (req.body.supportsApiKeyCreation === true) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          throw new Error('Main account token is required when supportsApiKeyCreation is enabled');
        }
      }
      // 如果值存在，验证是否为字符串
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value !== 'string') {
          throw new Error('Main account token must be a string');
        }
      }
      return true;
    })
];

/**
 * 更新提供商验证
 */
const updateProviderValidator = [
  param('id')
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('displayName')
    .optional()
    .isString()
    .withMessage('Display name must be a string'),
  body('baseUrl')
    .optional()
    .isURL()
    .withMessage('Invalid URL format'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL format'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('Invalid logo URL format'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('quota')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quota must be a non-negative number'),
  body('quotaUnit')
    .optional()
    .isIn(['points'])
    .withMessage('Quota unit must be points (积分)'),
  body('supportsApiKeyCreation')
    .optional()
    .isBoolean()
    .withMessage('supportsApiKeyCreation must be a boolean'),
  body('mainAccountToken')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      // 如果支持API Key创建，则mainAccountToken必填
      if (req.body.supportsApiKeyCreation === true) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          throw new Error('Main account token is required when supportsApiKeyCreation is enabled');
        }
      }
      // 如果值存在，验证是否为字符串
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value !== 'string') {
          throw new Error('Main account token must be a string');
        }
      }
      return true;
    })
];

/**
 * 获取提供商详情验证
 */
const getProviderDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Provider ID is required')
];

/**
 * 更新提供商状态验证
 */
const updateProviderStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('isActive')
    .notEmpty()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

module.exports = {
  getProvidersValidator,
  createProviderValidator,
  updateProviderValidator,
  getProviderDetailValidator,
  updateProviderStatusValidator
};
