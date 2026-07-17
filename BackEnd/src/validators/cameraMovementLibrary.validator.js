const { body, param, query } = require('express-validator')
const { MOVEMENT_TYPES } = require('../constants/cameraMovementLibrary')

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be 1-100'),
]

const listCameraMovementLibraryValidator = [
  ...paginationValidators,
  query('includeAll').optional().isBoolean().withMessage('includeAll must be boolean'),
  query('type').optional().isIn(MOVEMENT_TYPES).withMessage('Invalid type'),
  query('sort').optional().isIn(['sortOrder', 'name', 'new']).withMessage('Invalid sort'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
]

const idParamValidator = [param('id').notEmpty().withMessage('id is required')]

const createCameraMovementLibraryValidator = [
  body('key').trim().notEmpty().withMessage('key is required'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('prompt').trim().notEmpty().withMessage('prompt is required'),
  body('type').optional().isIn(MOVEMENT_TYPES).withMessage('Invalid type'),
  body('tagLabel').optional({ nullable: true }).isString(),
  body('previewUrl').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
]

const updateCameraMovementLibraryValidator = [
  ...idParamValidator,
  body('key').optional().trim().notEmpty().withMessage('key cannot be empty'),
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('prompt').optional().trim().notEmpty().withMessage('prompt cannot be empty'),
  body('type').optional().isIn(MOVEMENT_TYPES).withMessage('Invalid type'),
  body('tagLabel').optional({ nullable: true }).isString(),
  body('previewUrl').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
]

const deleteCameraMovementLibraryValidator = [
  ...idParamValidator,
  query('hard').optional().isBoolean().withMessage('hard must be boolean'),
]

module.exports = {
  listCameraMovementLibraryValidator,
  createCameraMovementLibraryValidator,
  updateCameraMovementLibraryValidator,
  deleteCameraMovementLibraryValidator,
  idParamValidator,
}
