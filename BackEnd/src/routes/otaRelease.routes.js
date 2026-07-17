const express = require('express')
const router = express.Router()
const otaReleaseController = require('../controllers/otaRelease.controller')
const { authenticate } = require('../middleware/auth')
const { requireAdminAccount } = require('../middleware/requireAdminAccount')
const { requireBackendMenuPermission } = require('../middleware/backendPermission')
const validate = require('../middleware/validate')
const {
  listOtaReleasesValidator,
  createOtaReleaseValidator,
  updateOtaReleaseValidator,
  idParamValidator,
  listOtaReportsValidator,
  uploadOtaArtifactValidator,
  publishOtaReleaseValidator,
} = require('../validators/otaRelease.validator')
const otaUpload = require('../middleware/otaUpload')

router.use(authenticate)
router.use(requireAdminAccount)
router.use(requireBackendMenuPermission('ota-releases'))

/**
 * @swagger
 * tags:
 *   name: OTA Releases
 *   description: OTA 发布管理
 */

router.get('/meta', otaReleaseController.getMeta.bind(otaReleaseController))
router.get('/reports', listOtaReportsValidator, validate, otaReleaseController.listReports.bind(otaReleaseController))
router.get('/releases', listOtaReleasesValidator, validate, otaReleaseController.list.bind(otaReleaseController))
router.get('/releases/:id', idParamValidator, validate, otaReleaseController.getDetail.bind(otaReleaseController))
router.post('/releases', createOtaReleaseValidator, validate, otaReleaseController.create.bind(otaReleaseController))
router.post('/releases/upload', otaUpload.single('file'), uploadOtaArtifactValidator, validate, otaReleaseController.uploadArtifact.bind(otaReleaseController))
router.put('/releases/:id', updateOtaReleaseValidator, validate, otaReleaseController.update.bind(otaReleaseController))
router.post('/releases/:id/publish', publishOtaReleaseValidator, validate, otaReleaseController.publish.bind(otaReleaseController))
router.post('/releases/:id/unpublish', idParamValidator, validate, otaReleaseController.unpublish.bind(otaReleaseController))
router.delete('/releases/:id', idParamValidator, validate, otaReleaseController.remove.bind(otaReleaseController))

module.exports = router
