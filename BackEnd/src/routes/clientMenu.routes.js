const express = require('express')
const router = express.Router()
const clientMenuController = require('../controllers/clientMenu.controller')
const { authenticate } = require('../middleware/auth')
const { requireBackendMenuPermission } = require('../middleware/backendPermission')
const validate = require('../middleware/validate')
const {
  treeQueryValidator,
  createMenuValidator,
  updateMenuValidator,
  idParamValidator,
  menuIdParamValidator,
  createButtonValidator,
  updateButtonValidator,
  deleteButtonValidator,
} = require('../validators/menuManagement.validator')

router.use(authenticate)
router.use(requireBackendMenuPermission('client-menu-manage'))

router.get('/meta', clientMenuController.getMeta.bind(clientMenuController))

router.get(
  '/tree',
  treeQueryValidator,
  validate,
  clientMenuController.getTree.bind(clientMenuController)
)

router.post(
  '/',
  createMenuValidator,
  validate,
  clientMenuController.create.bind(clientMenuController)
)

router.get(
  '/:menuId/buttons',
  menuIdParamValidator,
  validate,
  clientMenuController.listButtons.bind(clientMenuController)
)

router.post(
  '/:menuId/buttons',
  createButtonValidator,
  validate,
  clientMenuController.createButton.bind(clientMenuController)
)

router.put(
  '/:menuId/buttons/:buttonId',
  updateButtonValidator,
  validate,
  clientMenuController.updateButton.bind(clientMenuController)
)

router.delete(
  '/:menuId/buttons/:buttonId',
  deleteButtonValidator,
  validate,
  clientMenuController.removeButton.bind(clientMenuController)
)

router.get(
  '/:id',
  idParamValidator,
  validate,
  clientMenuController.getDetail.bind(clientMenuController)
)

router.put(
  '/:id',
  updateMenuValidator,
  validate,
  clientMenuController.update.bind(clientMenuController)
)

router.delete(
  '/:id',
  idParamValidator,
  validate,
  clientMenuController.remove.bind(clientMenuController)
)

module.exports = router
