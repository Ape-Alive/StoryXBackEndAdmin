const express = require('express')
const router = express.Router()
const cameraMovementLibraryController = require('../controllers/cameraMovementLibrary.controller')
const { authenticate } = require('../middleware/auth')
const { requireEntitlement } = require('../middleware/entitlement')
const { requireAnyBackendMenuPermission } = require('../middleware/backendPermission')
const { requireAnyClientPermission } = require('../middleware/clientPermission')
const { CLIENT_API_PERMISSIONS } = require('../constants/clientApiPermissions')
const validate = require('../middleware/validate')
const {
  listCameraMovementLibraryValidator,
  createCameraMovementLibraryValidator,
  updateCameraMovementLibraryValidator,
  deleteCameraMovementLibraryValidator,
  idParamValidator,
} = require('../validators/cameraMovementLibrary.validator')

router.use(authenticate)
router.use(requireEntitlement)
router.use(requireAnyBackendMenuPermission('camera-movement-library'))
router.use(requireAnyClientPermission(...CLIENT_API_PERMISSIONS.RESOURCE_READ))

/**
 * @swagger
 * tags:
 *   name: 运镜库
 *   description: 运镜模板管理（官方/自定义）
 */

router.get('/meta', cameraMovementLibraryController.getMeta.bind(cameraMovementLibraryController))

router.get(
  '/',
  listCameraMovementLibraryValidator,
  validate,
  cameraMovementLibraryController.list.bind(cameraMovementLibraryController)
)

router.post(
  '/',
  createCameraMovementLibraryValidator,
  validate,
  cameraMovementLibraryController.create.bind(cameraMovementLibraryController)
)

router.get(
  '/:id',
  idParamValidator,
  validate,
  cameraMovementLibraryController.getDetail.bind(cameraMovementLibraryController)
)

router.put(
  '/:id',
  updateCameraMovementLibraryValidator,
  validate,
  cameraMovementLibraryController.update.bind(cameraMovementLibraryController)
)

router.delete(
  '/:id',
  deleteCameraMovementLibraryValidator,
  validate,
  cameraMovementLibraryController.remove.bind(cameraMovementLibraryController)
)

module.exports = router
