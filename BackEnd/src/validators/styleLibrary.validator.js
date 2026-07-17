const { body, param, query } = require('express-validator')
const { MEDIA_TYPES, SCENE_SLUGS } = require('../constants/styleLibrary')

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be 1-100'),
]

const tagsBodyValidator = body('tags')
  .notEmpty()
  .withMessage('tags is required')
  .custom(value => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('tags must be an object')
    }
    if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
      throw new Error('tags.scenes must be a non-empty array')
    }
    for (const slug of value.scenes) {
      if (!SCENE_SLUGS.includes(slug)) {
        throw new Error(`Invalid scene slug: ${slug}`)
      }
    }
    if (value.labels !== undefined && !Array.isArray(value.labels)) {
      throw new Error('tags.labels must be an array')
    }
    return true
  })

const tagsBodyOptionalValidator = body('tags')
  .optional()
  .custom(value => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('tags must be an object')
    }
    if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
      throw new Error('tags.scenes must be a non-empty array')
    }
    for (const slug of value.scenes) {
      if (!SCENE_SLUGS.includes(slug)) {
        throw new Error(`Invalid scene slug: ${slug}`)
      }
    }
    if (value.labels !== undefined && !Array.isArray(value.labels)) {
      throw new Error('tags.labels must be an array')
    }
    return true
  })

const listStyleLibraryValidator = [
  ...paginationValidators,
  query('includeAll').optional().isBoolean().withMessage('includeAll must be boolean'),
  query('mediaType').optional().isIn(MEDIA_TYPES).withMessage('Invalid mediaType'),
  query('scene').optional().isIn(SCENE_SLUGS).withMessage('Invalid scene'),
  query('systemPromptId').optional().isString().withMessage('systemPromptId must be a string'),
  query('sort').optional().isIn(['recommend', 'hot', 'new', 'sortOrder']).withMessage('Invalid sort'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
]

const idParamValidator = [param('id').notEmpty().withMessage('id is required')]

const systemPromptIdsValidator = body('systemPromptIds')
  .optional()
  .isArray()
  .withMessage('systemPromptIds must be an array')
  .custom(value => {
    if (value === undefined) return true
    if (!value.every(id => typeof id === 'string' && id.trim())) {
      throw new Error('Each systemPromptId must be a non-empty string')
    }
    return true
  })

const systemPromptIdsOptionalValidator = body('systemPromptIds')
  .optional()
  .isArray()
  .withMessage('systemPromptIds must be an array')
  .custom(value => {
    if (value === undefined) return true
    if (!value.every(id => typeof id === 'string' && id.trim())) {
      throw new Error('Each systemPromptId must be a non-empty string')
    }
    return true
  })

const createStyleLibraryValidator = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('mediaType').isIn(MEDIA_TYPES).withMessage('Invalid mediaType'),
  systemPromptIdsValidator,
  body('content').trim().notEmpty().withMessage('content is required'),
  tagsBodyValidator,
  body('summary').optional({ nullable: true }).isString(),
  body('coverUrl').optional({ nullable: true }).isString(),
  body('stylePromptKey').optional({ nullable: true }).isString(),
  body('recommendScore').optional().isInt(),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean(),
]

const updateStyleLibraryValidator = [
  ...idParamValidator,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('mediaType').optional().isIn(MEDIA_TYPES).withMessage('Invalid mediaType'),
  systemPromptIdsOptionalValidator,
  tagsBodyOptionalValidator,
  body('summary').optional({ nullable: true }).isString(),
  body('coverUrl').optional({ nullable: true }).isString(),
  body('content').optional().trim().notEmpty().withMessage('content cannot be empty'),
  body('stylePromptKey').optional({ nullable: true }).isString(),
  body('recommendScore').optional().isInt(),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean(),
  body('publishedAt').optional({ nullable: true }).isISO8601(),
]

const deleteStyleLibraryValidator = [
  ...idParamValidator,
  query('hard').optional().isBoolean().withMessage('hard must be boolean'),
]

module.exports = {
  listStyleLibraryValidator,
  createStyleLibraryValidator,
  updateStyleLibraryValidator,
  deleteStyleLibraryValidator,
  idParamValidator,
}
