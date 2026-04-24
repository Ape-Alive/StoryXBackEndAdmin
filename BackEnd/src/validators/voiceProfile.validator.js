const { body, param, query } = require('express-validator')

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be 1-100'),
]

const getVoiceProfilesValidator = [
  ...paginationValidators,
  query('scope').optional().isIn(['system', 'user']).withMessage('Invalid scope'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('includeAll').optional().isBoolean().withMessage('includeAll must be boolean'),
]

const getVoiceProfileDetailValidator = [param('id').notEmpty().withMessage('id is required')]

const createVoiceProfileValidator = [
  body('voiceId').notEmpty().withMessage('voiceId is required'),
  body('scope').optional().isIn(['system', 'user']).withMessage('Invalid scope'),
  body('modelId').optional().isString(), // 兼容旧字段
  body('modelIds').optional().isArray(),
  body('modelIds.*').optional().isString(),
  body('sampleUrl').optional().custom(v => v === null || typeof v === 'string'),
  body('avatarUrl').optional().custom(v => v === null || typeof v === 'string'),
  body('name').optional().custom(v => v === null || typeof v === 'string'),
  body('description').optional().custom(v => v === null || typeof v === 'string'),
  body('meta').optional().custom(v => v === null || typeof v === 'string'),
  body('supportsVoiceCommand').optional().isBoolean().withMessage('supportsVoiceCommand must be boolean'),
  body('tags')
    .optional()
    .custom((v) => v === null || Array.isArray(v))
    .withMessage('tags must be an array')
  ,
  body('isActive').optional().isBoolean(),
]

const updateVoiceProfileValidator = [
  param('id').notEmpty().withMessage('id is required'),
  body('voiceId').optional().isString(),
  body('modelId').optional().custom(v => v === null || typeof v === 'string'), // 兼容旧字段
  body('modelIds').optional().custom(v => v === null || Array.isArray(v)),
  body('modelIds.*').optional().isString(),
  body('sampleUrl').optional().custom(v => v === null || typeof v === 'string'),
  body('avatarUrl').optional().custom(v => v === null || typeof v === 'string'),
  body('name').optional().custom(v => v === null || typeof v === 'string'),
  body('description').optional().custom(v => v === null || typeof v === 'string'),
  body('meta').optional().custom(v => v === null || typeof v === 'string'),
  body('supportsVoiceCommand').optional().isBoolean().withMessage('supportsVoiceCommand must be boolean'),
  body('tags')
    .optional()
    .custom((v) => v === null || Array.isArray(v))
    .withMessage('tags must be an array')
  ,
  body('isActive').optional().isBoolean(),
]

const deleteVoiceProfileValidator = [param('id').notEmpty().withMessage('id is required')]

const cloneVoiceProfileValidator = [
  body('providerId').notEmpty().withMessage('providerId is required'),
  body('apiPath').notEmpty().withMessage('apiPath is required'),
  body('userApiKeyId').notEmpty().withMessage('userApiKeyId is required'),
  // 与上游复刻接口一致：仅英文字母与数字（不含空格、下划线、中文等）
  body('prefix')
    .trim()
    .notEmpty()
    .withMessage('prefix is required')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('prefix 仅支持英文字母与数字'),
  body('audioUrl').notEmpty().withMessage('audioUrl is required'),
  body('modelId').notEmpty().withMessage('modelId is required'),
]

module.exports = {
  getVoiceProfilesValidator,
  getVoiceProfileDetailValidator,
  createVoiceProfileValidator,
  updateVoiceProfileValidator,
  deleteVoiceProfileValidator,
  cloneVoiceProfileValidator,
}

