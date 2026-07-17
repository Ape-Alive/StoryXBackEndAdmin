const { body, param } = require('express-validator')

const idParamValidator = [param('id').notEmpty().withMessage('id is required')]

const createBackendRoleValidator = [
  body('roleKey')
    .trim()
    .notEmpty()
    .withMessage('roleKey is required')
    .matches(/^[a-z][a-z0-9_]*$/)
    .withMessage('roleKey must start with a letter and contain only lowercase letters, numbers, and underscores'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('description').optional({ nullable: true }).isString(),
]

const updateBackendRoleValidator = [
  ...idParamValidator,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('description').optional({ nullable: true }).isString(),
  body('sortOrder').optional().isInt(),
  body('status').optional().isIn(['active', 'disabled']).withMessage('Invalid status'),
]

const saveBackendRolePermissionsValidator = [
  ...idParamValidator,
  body('menuIds').isArray().withMessage('menuIds must be an array'),
  body('buttonIds').isArray().withMessage('buttonIds must be an array'),
  body('menuIds.*').isString().withMessage('menuIds items must be strings'),
  body('buttonIds.*').isString().withMessage('buttonIds items must be strings'),
]

module.exports = {
  idParamValidator,
  createBackendRoleValidator,
  updateBackendRoleValidator,
  saveBackendRolePermissionsValidator,
}
