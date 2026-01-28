const { body, query, param } = require('express-validator');

/**
 * 套餐列表查询验证
 */
const getPackagesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('type')
    .optional()
    .isIn(['free', 'paid', 'trial'])
    .withMessage('Invalid package type'),
  query('isActive')
    .optional()
    .custom((value) => {
      if (value === 'true' || value === 'false' || value === true || value === false) {
        return true;
      }
      throw new Error('isActive must be a boolean');
    })
    .withMessage('isActive must be a boolean'),
  query('isStackable')
    .optional()
    .custom((value) => {
      if (value === 'true' || value === 'false' || value === true || value === false) {
        return true;
      }
      throw new Error('isStackable must be a boolean');
    })
    .withMessage('isStackable must be a boolean')
];

/**
 * 创建套餐验证
 */
const createPackageValidator = [
  body('name')
    .notEmpty()
    .withMessage('Package name is required')
    .isString()
    .withMessage('Package name must be a string'),
  body('displayName')
    .notEmpty()
    .withMessage('Display name is required')
    .isString()
    .withMessage('Display name must be a string'),
  body('type')
    .notEmpty()
    .withMessage('Package type is required')
    .isIn(['free', 'paid', 'trial'])
    .withMessage('Invalid package type'),
  body('duration')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1;
    })
    .withMessage('Duration must be a positive integer or null (永久)'),
  body('quota')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    })
    .withMessage('Quota must be a non-negative number or null (无限)'),
  body('price')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    })
    .withMessage('Price must be a non-negative number'),
  body('priceUnit')
    .optional({ nullable: true })
    .isIn(['CNY', 'USD'])
    .withMessage('Price unit must be one of: CNY, USD'),
  body('discount')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    })
    .withMessage('Discount must be between 0 and 100 (percentage)'),
  body('availableModels')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Array.isArray(value);
    })
    .withMessage('Available models must be an array or null'),
  body('maxDevices')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1;
    })
    .withMessage('Max devices must be a positive integer or null (无限)'),
  body('isStackable')
    .optional()
    .isBoolean()
    .withMessage('isStackable must be a boolean'),
  body('priority')
    .optional()
    .isInt()
    .withMessage('Priority must be an integer')
];

/**
 * 更新套餐验证
 */
const updatePackageValidator = [
  param('id')
    .notEmpty()
    .withMessage('Package ID is required'),
  body('displayName')
    .optional()
    .isString()
    .withMessage('Display name must be a string'),
  body('type')
    .optional()
    .isIn(['free', 'paid', 'trial'])
    .withMessage('Invalid package type'),
  body('duration')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1;
    })
    .withMessage('Duration must be a positive integer or null (永久)'),
  body('quota')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    })
    .withMessage('Quota must be a non-negative number or null (无限)'),
  body('price')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    })
    .withMessage('Price must be a non-negative number'),
  body('priceUnit')
    .optional({ nullable: true })
    .isIn(['CNY', 'USD'])
    .withMessage('Price unit must be one of: CNY, USD'),
  body('discount')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    })
    .withMessage('Discount must be between 0 and 100 (percentage)'),
  body('availableModels')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Array.isArray(value);
    })
    .withMessage('Available models must be an array or null'),
  body('maxDevices')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1;
    })
    .withMessage('Max devices must be a positive integer or null (无限)'),
  body('isStackable')
    .optional()
    .isBoolean()
    .withMessage('isStackable must be a boolean'),
  body('priority')
    .optional()
    .isInt()
    .withMessage('Priority must be an integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

/**
 * 复制套餐验证
 */
const duplicatePackageValidator = [
  param('id')
    .notEmpty()
    .withMessage('Package ID is required'),
  body('newName')
    .notEmpty()
    .withMessage('New package name is required')
    .isString()
    .withMessage('New package name must be a string'),
  body('newDisplayName')
    .notEmpty()
    .withMessage('New display name is required')
    .isString()
    .withMessage('New display name must be a string')
];

module.exports = {
  getPackagesValidator,
  createPackageValidator,
  updatePackageValidator,
  duplicatePackageValidator
};
