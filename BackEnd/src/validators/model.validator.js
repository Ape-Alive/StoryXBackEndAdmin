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
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
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
 * 创建模型验证
 */
const createModelValidator = [
  body('name')
    .notEmpty()
    .withMessage('Model name is required')
    .isString()
    .withMessage('Model name must be a string'),
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
    .withMessage('requiresKey must be a boolean')
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
    .withMessage('requiresKey must be a boolean')
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

module.exports = {
  getModelsValidator,
  createModelValidator,
  updateModelValidator,
  batchUpdateStatusValidator,
  batchDeleteValidator
};
