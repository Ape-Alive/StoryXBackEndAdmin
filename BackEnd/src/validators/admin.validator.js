const { body, query, param } = require('express-validator');
const { ROLES } = require('../constants/roles');

/**
 * 管理员列表查询验证
 */
const getAdminsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('adminId')
    .optional()
    .isString()
    .withMessage('Admin ID must be a string'),
  query('username')
    .optional()
    .isString()
    .withMessage('Username must be a string'),
  query('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  query('role')
    .optional()
    .isIn([ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY])
    .withMessage('Invalid role'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('lastLoginStart')
    .optional()
    .isISO8601()
    .withMessage('Invalid last login start date format'),
  query('lastLoginEnd')
    .optional()
    .isISO8601()
    .withMessage('Invalid last login end date format'),
  query('orderBy')
    .optional()
    .isIn(['createdAt', 'lastLogin'])
    .withMessage('Invalid orderBy field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid order')
];

/**
 * 获取管理员详情验证
 */
const getAdminDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Admin ID is required')
];

/**
 * 创建管理员验证
 */
const createAdminValidator = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 50 })
    .withMessage('Password must be between 6 and 50 characters'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn([ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY])
    .withMessage('Invalid role. Super admin cannot be created.'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status')
];

/**
 * 更新管理员验证
 */
const updateAdminValidator = [
  param('id')
    .notEmpty()
    .withMessage('Admin ID is required'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .optional()
    .isLength({ min: 6, max: 50 })
    .withMessage('Password must be between 6 and 50 characters'),
  body('role')
    .optional()
    .isIn([ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY])
    .withMessage('Invalid role. Cannot change to super_admin.'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status')
];

/**
 * 更新管理员状态验证
 */
const updateAdminStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage('Admin ID is required'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status')
];

/**
 * 更新管理员角色验证
 */
const updateAdminRoleValidator = [
  param('id')
    .notEmpty()
    .withMessage('Admin ID is required'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn([ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY])
    .withMessage('Invalid role. Cannot change to super_admin.')
];

/**
 * 删除管理员验证
 */
const deleteAdminValidator = [
  param('id')
    .notEmpty()
    .withMessage('Admin ID is required')
];

/**
 * 批量更新状态验证
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
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status')
];

/**
 * 批量删除验证
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
  getAdminsValidator,
  getAdminDetailValidator,
  createAdminValidator,
  updateAdminValidator,
  updateAdminStatusValidator,
  updateAdminRoleValidator,
  deleteAdminValidator,
  batchUpdateStatusValidator,
  batchDeleteValidator
};

