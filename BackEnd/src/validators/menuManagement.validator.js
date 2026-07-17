const { body, param, query } = require('express-validator')
const { REQUIRED_LANGUAGE } = require('../constants/menuManagement')

function resolveLabel(item) {
  return item?.label ?? item?.name
}

const i18nNamesValidator = body('i18nNames')
  .optional()
  .isArray()
  .withMessage('i18nNames must be an array')
  .custom(items => {
    if (!Array.isArray(items)) return true
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        throw new Error('each i18nNames item must be an object')
      }
      const language = item.language || item.locale
      if (!language || !String(language).trim()) {
        throw new Error('each i18nNames item must have a language')
      }
      const label = resolveLabel(item)
      if (!label || !String(label).trim()) {
        throw new Error('each i18nNames item must have a label')
      }
    }
    return true
  })

const requiredI18nNamesValidator = body('i18nNames')
  .isArray()
  .withMessage('i18nNames must be an array')
  .custom(items => {
    if (!Array.isArray(items)) {
      throw new Error('i18nNames must be an array')
    }
    const zhItem = items.find(item => {
      const language = item?.language || item?.locale
      const label = resolveLabel(item)
      return language === REQUIRED_LANGUAGE && label && String(label).trim()
    })
    if (!zhItem) {
      throw new Error('Simplified Chinese (zh) label is required')
    }
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        throw new Error('each i18nNames item must be an object')
      }
      const language = item.language || item.locale
      if (!language || !String(language).trim()) {
        throw new Error('each i18nNames item must have a language')
      }
      const label = resolveLabel(item)
      if (!label || !String(label).trim()) {
        throw new Error('each i18nNames item must have a label')
      }
    }
    return true
  })

const requiredPermissionCodeValidator = field =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .matches(/^[A-Z][A-Z0-9_]*$/)
    .withMessage(`${field} must be UPPER_SNAKE_CASE`)

const optionalPermissionCodeValidator = field =>
  body(field)
    .optional({ nullable: true })
    .custom(value => {
      if (value == null || value === '') return true
      if (!/^[A-Z][A-Z0-9_]*$/.test(String(value))) {
        throw new Error(`${field} must be UPPER_SNAKE_CASE`)
      }
      return true
    })

const idParamValidator = [param('id').notEmpty().withMessage('id is required')]

const menuIdParamValidator = [param('menuId').notEmpty().withMessage('menuId is required')]

const buttonIdParamValidator = [param('buttonId').notEmpty().withMessage('buttonId is required')]

const treeQueryValidator = [
  query('keyword').optional().isString().withMessage('keyword must be a string'),
]

const createMenuValidator = [
  body('name').trim().notEmpty().withMessage('name is required'),
  requiredI18nNamesValidator,
  body('path').trim().notEmpty().withMessage('path is required'),
  requiredPermissionCodeValidator('frontendPermissionCode'),
  requiredPermissionCodeValidator('backendPermissionCode'),
  body('parentId').notEmpty().withMessage('parentId is required'),
  body('sortOrder').isInt().withMessage('sortOrder must be an integer'),
]

const updateMenuValidator = [
  ...idParamValidator,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  i18nNamesValidator,
  body('path').optional().trim().notEmpty().withMessage('path cannot be empty'),
  optionalPermissionCodeValidator('frontendPermissionCode'),
  optionalPermissionCodeValidator('backendPermissionCode'),
  body('parentId').optional().notEmpty().withMessage('parentId cannot be empty'),
  body('sortOrder').optional().isInt().withMessage('sortOrder must be an integer'),
]

const createButtonValidator = [
  ...menuIdParamValidator,
  body('name').trim().notEmpty().withMessage('name is required'),
  requiredI18nNamesValidator,
  body('isVisible').optional().isBoolean(),
  body('isDisabled').optional().isBoolean(),
  optionalPermissionCodeValidator('frontendPermissionCode'),
  optionalPermissionCodeValidator('backendPermissionCode'),
  body('sortOrder').optional().isInt(),
]

const updateButtonValidator = [
  ...menuIdParamValidator,
  ...buttonIdParamValidator,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  i18nNamesValidator,
  body('isVisible').optional().isBoolean(),
  body('isDisabled').optional().isBoolean(),
  optionalPermissionCodeValidator('frontendPermissionCode'),
  optionalPermissionCodeValidator('backendPermissionCode'),
  body('sortOrder').optional().isInt(),
]

const deleteButtonValidator = [...menuIdParamValidator, ...buttonIdParamValidator]

module.exports = {
  treeQueryValidator,
  createMenuValidator,
  updateMenuValidator,
  idParamValidator,
  menuIdParamValidator,
  createButtonValidator,
  updateButtonValidator,
  deleteButtonValidator,
}
