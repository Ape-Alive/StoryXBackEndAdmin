const express = require('express')
const router = express.Router()
const clientRoleController = require('../controllers/clientRole.controller')
const { authenticate } = require('../middleware/auth')
const { requireBackendMenuPermission } = require('../middleware/backendPermission')
const validate = require('../middleware/validate')
const {
  idParamValidator,
  createClientRoleValidator,
  updateClientRoleValidator,
  saveClientRolePermissionsValidator,
} = require('../validators/clientRole.validator')

router.use(authenticate)
router.use(requireBackendMenuPermission('client-role-permission'))

router.get('/', clientRoleController.list.bind(clientRoleController))

router.post(
  '/',
  createClientRoleValidator,
  validate,
  clientRoleController.create.bind(clientRoleController)
)

router.get(
  '/:id/permissions',
  idParamValidator,
  validate,
  clientRoleController.getPermissions.bind(clientRoleController)
)

router.put(
  '/:id/permissions',
  saveClientRolePermissionsValidator,
  validate,
  clientRoleController.savePermissions.bind(clientRoleController)
)

router.get(
  '/:id',
  idParamValidator,
  validate,
  clientRoleController.getDetail.bind(clientRoleController)
)

router.put(
  '/:id',
  updateClientRoleValidator,
  validate,
  clientRoleController.update.bind(clientRoleController)
)

router.delete(
  '/:id',
  idParamValidator,
  validate,
  clientRoleController.remove.bind(clientRoleController)
)

module.exports = router
