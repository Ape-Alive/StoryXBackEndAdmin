const { body, param, query } = require('express-validator')

const listOtaReleasesValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 200 }),
  query('layer').optional().isIn(['shell', 'backend', 'frontend']),
  query('channel').optional().isIn(['stable', 'beta', 'internal']),
]

const idParamValidator = [param('id').isString().notEmpty()]

const createOtaReleaseValidator = [
  body('layer').isIn(['shell', 'backend', 'frontend']),
  body('version').isString().notEmpty(),
  body('buildNumber').isInt({ min: 1 }),
  body('downloadUrl').isString().notEmpty(),
  body('sha256').isString().notEmpty(),
  body('fileSize').isInt({ min: 1 }),
  body('channel').optional().isIn(['stable', 'beta', 'internal']),
  body('forceUpdate').optional().isBoolean(),
  body('rolloutPercent').optional().isInt({ min: 0, max: 100 }),
  body('targetDeviceIds').optional().isArray(),
  body('targetDeviceIds.*').optional().isString(),
  body('deviceIds').optional().isArray(),
  body('deviceIds.*').optional().isString(),
]

const updateOtaReleaseValidator = [
  ...idParamValidator,
  body('downloadUrl').optional().isString().notEmpty(),
  body('sha256').optional().isString().notEmpty(),
  body('fileSize').optional().isInt({ min: 1 }),
  body('forceUpdate').optional().isBoolean(),
  body('rolloutPercent').optional().isInt({ min: 0, max: 100 }),
  body('targetDeviceIds').optional().isArray(),
  body('targetDeviceIds.*').optional().isString(),
  body('deviceIds').optional().isArray(),
  body('deviceIds.*').optional().isString(),
]

const publishOtaReleaseValidator = [
  ...idParamValidator,
  body('mode').optional().isIn(['immediate', 'scheduled']),
  body('publishAt').optional().isISO8601(),
]

const checkOtaValidator = [
  body('platform').optional().isString(),
  body('arch').optional().isString(),
  body('channel').optional().isIn(['stable', 'beta', 'internal']),
  body('deviceId').optional().isString(),
  body('current').optional().isObject(),
]

const reportOtaValidator = [
  body('deviceId').isString().notEmpty(),
  body('event').isIn(['download_complete', 'apply_success', 'apply_failed', 'rollback', 'check']),
  body('layer').optional().isIn(['shell', 'backend', 'frontend']),
  body('fromBuild').optional().isInt(),
  body('toBuild').optional().isInt(),
  body('platform').optional().isString(),
  body('channel').optional().isString(),
  // 客户端成功上报常带 error: null；optional 默认只跳过 undefined
  body('error').optional({ values: 'null' }).isString(),
]

const listOtaReportsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 200 }),
  query('deviceId').optional().isString(),
  query('event').optional().isString(),
  query('layer').optional().isIn(['shell', 'backend', 'frontend']),
]

const uploadOtaArtifactValidator = [
  body('layer').optional().isIn(['shell', 'backend', 'frontend', 'misc']),
  body('buildNumber').optional().isInt({ min: 1 }),
]

module.exports = {
  listOtaReleasesValidator,
  idParamValidator,
  createOtaReleaseValidator,
  updateOtaReleaseValidator,
  publishOtaReleaseValidator,
  checkOtaValidator,
  reportOtaValidator,
  listOtaReportsValidator,
  uploadOtaArtifactValidator,
}
