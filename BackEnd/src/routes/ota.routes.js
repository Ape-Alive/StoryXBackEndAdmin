const express = require('express')
const router = express.Router()
const otaReleaseController = require('../controllers/otaRelease.controller')
const validate = require('../middleware/validate')
const {
  checkOtaValidator,
  reportOtaValidator,
} = require('../validators/otaRelease.validator')
const { otaCheckRateLimit } = require('../middleware/otaRateLimit')

/**
 * @swagger
 * tags:
 *   name: OTA
 *   description: 客户端 OTA 检查与上报
 */
router.post('/check', otaCheckRateLimit, checkOtaValidator, validate, otaReleaseController.check.bind(otaReleaseController))
router.post('/report', otaCheckRateLimit, reportOtaValidator, validate, otaReleaseController.report.bind(otaReleaseController))

module.exports = router
