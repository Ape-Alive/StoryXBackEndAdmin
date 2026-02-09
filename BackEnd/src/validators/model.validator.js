const { body, query, param } = require('express-validator');
const { MODEL_TYPE } = require('../constants/modelType');

/**
 * 模型列表查询验证
 */
const getModelsValidator = [
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
  query('type')
    .optional()
    .isIn(Object.values(MODEL_TYPE))
    .withMessage('Invalid model type'),
  query('providerId')
    .optional()
    .isString()
    .withMessage('Provider ID must be a string'),
  query('isActive')
    .optional()
    .custom((value) => {
      if (value === 'true' || value === 'false' || value === true || value === false) {
        return true;
      }
      throw new Error('isActive must be a boolean');
    })
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
 * 创建模型验证
 */
const createModelValidator = [
  body('name')
    .notEmpty()
    .withMessage('Model name is required')
    .isString()
    .withMessage('Model name must be a string')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Model name can only contain letters, numbers, underscores, dots, and hyphens'),
  body('displayName')
    .notEmpty()
    .withMessage('Display name is required')
    .isString()
    .withMessage('Display name must be a string'),
  body('type')
    .notEmpty()
    .withMessage('Model type is required')
    .isIn(Object.values(MODEL_TYPE))
    .withMessage('Invalid model type'),
  body('providerId')
    .notEmpty()
    .withMessage('Provider ID is required')
    .isString()
    .withMessage('Provider ID must be a string'),
  body('baseUrl')
    .notEmpty()
    .withMessage('Base URL is required')
    .isString()
    .withMessage('Base URL must be a string'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('requiresKey')
    .optional()
    .isBoolean()
    .withMessage('requiresKey must be a boolean'),
  body('apiConfig')
    .optional()
    .isString()
    .withMessage('API config must be a string')
    .custom((value) => {
      if (value) {
        try {
          JSON.parse(value);
          return true;
        } catch (e) {
          throw new Error('API config must be a valid JSON string');
        }
      }
      return true;
    })
    .withMessage('API config must be a valid JSON string')
];

/**
 * 更新模型验证
 */
const updateModelValidator = [
  param('id')
    .notEmpty()
    .withMessage('Model ID is required'),
  body('displayName')
    .optional()
    .isString()
    .withMessage('Display name must be a string'),
  body('type')
    .optional()
    .isIn(Object.values(MODEL_TYPE))
    .withMessage('Invalid model type'),
  body('baseUrl')
    .optional()
    .isString()
    .withMessage('Base URL must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('requiresKey')
    .optional()
    .isBoolean()
    .withMessage('requiresKey must be a boolean'),
  body('apiConfig')
    .optional()
    .isString()
    .withMessage('API config must be a string')
    .custom((value) => {
      if (value) {
        try {
          JSON.parse(value);
          return true;
        } catch (e) {
          throw new Error('API config must be a valid JSON string');
        }
      }
      return true;
    })
    .withMessage('API config must be a valid JSON string')
];

/**
 * 批量操作验证
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
  body('isActive')
    .notEmpty()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

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

/**
 * 获取模型价格列表验证（POST分页查询）
 */
const getModelPricesValidator = [
  body('modelId')
    .optional()
    .isString()
    .withMessage('Model ID must be a string'),
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  body('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  body('packageId')
    .optional()
    .isString()
    .withMessage('Package ID must be a string'),
  body('pricingType')
    .optional()
    .isIn(['token', 'call'])
    .withMessage('Pricing type must be either token or call'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('expiredStartDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expired start date format'),
  body('expiredEndDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expired end date format')
];

/**
 * 创建模型价格验证
 */
const createModelPriceValidator = [
  param('id')
    .notEmpty()
    .withMessage('Model ID is required'),
  body('packageId')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // 允许 null 或空字符串
      }
      if (typeof value === 'string') {
        return true;
      }
      throw new Error('Package ID must be a string or null');
    })
    .withMessage('Package ID must be a string or null'),
  body('pricingType')
    .notEmpty()
    .withMessage('Pricing type is required')
    .isIn(['token', 'call'])
    .withMessage('Pricing type must be either token or call'),
  body('inputPrice')
    .optional()
    .custom((value, { req }) => {
      if (req.body.pricingType === 'token') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Input price is required when pricing type is token');
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Input price must be a non-negative number');
        }
      }
      return true;
    })
    .withMessage('Input price must be a non-negative number'),
  body('outputPrice')
    .optional()
    .custom((value, { req }) => {
      if (req.body.pricingType === 'token') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Output price is required when pricing type is token');
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Output price must be a non-negative number');
        }
      }
      return true;
    })
    .withMessage('Output price must be a non-negative number'),
  body('callPrice')
    .optional()
    .custom((value, { req }) => {
      if (req.body.pricingType === 'call') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Call price is required when pricing type is call');
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Call price must be a non-negative number');
        }
      }
      return true;
    })
    .withMessage('Call price must be a non-negative number'),
  body('maxToken')
    .optional()
    .custom((value, { req }) => {
      // maxToken只在pricingType为token时有效
      if (req.body.pricingType === 'token') {
        if (value === null || value === undefined || value === '') {
          return true; // 允许null，表示不限制
        }
        const intValue = typeof value === 'string' ? parseInt(value) : value;
        if (isNaN(intValue) || intValue < 1) {
          throw new Error('Max token must be a positive integer or null');
        }
      }
      return true;
    })
    .withMessage('Max token must be a positive integer or null (only valid when pricing type is token)'),
  body('effectiveAt')
    .notEmpty()
    .withMessage('Effective date is required')
    .isISO8601()
    .withMessage('Invalid effective date format'),
  body('expiredAt')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // 允许 null 或空字符串
      }
      // 验证 ISO8601 格式
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!iso8601Regex.test(value) && !Date.parse(value)) {
        throw new Error('Invalid expired date format');
      }
      return true;
    })
    .withMessage('Invalid expired date format')
];

/**
 * 更新模型价格验证
 */
const updateModelPriceValidator = [
  param('id')
    .notEmpty()
    .withMessage('Model ID is required'),
  param('priceId')
    .notEmpty()
    .withMessage('Price ID is required'),
  body('pricingType')
    .optional()
    .isIn(['token', 'call'])
    .withMessage('Pricing type must be either token or call'),
  body('inputPrice')
    .optional()
    .custom((value, { req }) => {
      // 如果提供了 pricingType，则根据类型验证
      if (req.body.pricingType === 'token') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Input price is required when pricing type is token');
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Input price must be a non-negative number');
        }
      } else if (value !== undefined && value !== null && value !== '') {
        // 如果提供了值但不是 token 类型，也要验证格式
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Input price must be a non-negative number');
        }
      }
      return true;
    })
    .withMessage('Input price must be a non-negative number'),
  body('outputPrice')
    .optional()
    .custom((value, { req }) => {
      // 如果提供了 pricingType，则根据类型验证
      if (req.body.pricingType === 'token') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Output price is required when pricing type is token');
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Output price must be a non-negative number');
        }
      } else if (value !== undefined && value !== null && value !== '') {
        // 如果提供了值但不是 token 类型，也要验证格式
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Output price must be a non-negative number');
        }
      }
      return true;
    })
    .withMessage('Output price must be a non-negative number'),
  body('callPrice')
    .optional()
    .custom((value, { req }) => {
      // 如果提供了 pricingType，则根据类型验证
      if (req.body.pricingType === 'call') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Call price is required when pricing type is call');
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Call price must be a non-negative number');
        }
      } else if (value !== undefined && value !== null && value !== '') {
        // 如果提供了值但不是 call 类型，也要验证格式
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Call price must be a non-negative number');
        }
      }
      return true;
    })
    .withMessage('Call price must be a non-negative number'),
  body('maxToken')
    .optional()
    .custom((value, { req }) => {
      // maxToken只在pricingType为token时有效
      // 如果提供了pricingType且为token，或者当前价格是token类型
      if (value === null || value === undefined || value === '') {
        return true; // 允许null，表示不限制
      }
      const intValue = typeof value === 'string' ? parseInt(value) : value;
      if (isNaN(intValue) || intValue < 1) {
        throw new Error('Max token must be a positive integer or null');
      }
      return true;
    })
    .withMessage('Max token must be a positive integer or null (only valid when pricing type is token)'),
  body('effectiveAt')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // 允许不更新
      }
      // 验证 ISO8601 格式
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!iso8601Regex.test(value) && !Date.parse(value)) {
        throw new Error('Invalid effective date format');
      }
      return true;
    })
    .withMessage('Invalid effective date format'),
  body('expiredAt')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // 允许 null 或空字符串
      }
      // 验证 ISO8601 格式
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!iso8601Regex.test(value) && !Date.parse(value)) {
        throw new Error('Invalid expired date format');
      }
      return true;
    })
    .withMessage('Invalid expired date format')
];

module.exports = {
  getModelsValidator,
  createModelValidator,
  updateModelValidator,
  batchUpdateStatusValidator,
  batchDeleteValidator,
  getModelPricesValidator,
  createModelPriceValidator,
  updateModelPriceValidator
};
