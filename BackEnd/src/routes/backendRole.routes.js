const express = require('express')
const router = express.Router()
const backendRoleController = require('../controllers/backendRole.controller')
const { authenticate } = require('../middleware/auth')
const { requireBackendMenuPermission } = require('../middleware/backendPermission')
const validate = require('../middleware/validate')
const {
  idParamValidator,
  createBackendRoleValidator,
  updateBackendRoleValidator,
  saveBackendRolePermissionsValidator,
} = require('../validators/backendRole.validator')

router.use(authenticate)
router.use(requireBackendMenuPermission('backend-role-permission'))

router.get('/', backendRoleController.list.bind(backendRoleController))

router.get('/options', backendRoleController.listOptions.bind(backendRoleController))

router.post(
  '/',
  createBackendRoleValidator,
  validate,
  backendRoleController.create.bind(backendRoleController)
)

router.get(
  '/:id/permissions',
  idParamValidator,
  validate,
  backendRoleController.getPermissions.bind(backendRoleController)
)

router.put(
  '/:id/permissions',
  saveBackendRolePermissionsValidator,
  validate,
  backendRoleController.savePermissions.bind(backendRoleController)
)

router.get(
  '/:id',
  idParamValidator,
  validate,
  backendRoleController.getDetail.bind(backendRoleController)
)

router.put(
  '/:id',
  updateBackendRoleValidator,
  validate,
  backendRoleController.update.bind(backendRoleController)
)

router.delete(
  '/:id',
  idParamValidator,
  validate,
  backendRoleController.remove.bind(backendRoleController)
)

module.exports = router
