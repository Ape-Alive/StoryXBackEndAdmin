const express = require('express')
const router = express.Router()
const backendMenuController = require('../controllers/backendMenu.controller')
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
router.use(requireBackendMenuPermission('backend-menu-manage'))

router.get('/meta', backendMenuController.getMeta.bind(backendMenuController))

router.get(
  '/tree',
  treeQueryValidator,
  validate,
  backendMenuController.getTree.bind(backendMenuController)
)

router.post(
  '/',
  createMenuValidator,
  validate,
  backendMenuController.create.bind(backendMenuController)
)

router.get(
  '/:menuId/buttons',
  menuIdParamValidator,
  validate,
  backendMenuController.listButtons.bind(backendMenuController)
)

router.post(
  '/:menuId/buttons',
  createButtonValidator,
  validate,
  backendMenuController.createButton.bind(backendMenuController)
)

router.put(
  '/:menuId/buttons/:buttonId',
  updateButtonValidator,
  validate,
  backendMenuController.updateButton.bind(backendMenuController)
)

router.delete(
  '/:menuId/buttons/:buttonId',
  deleteButtonValidator,
  validate,
  backendMenuController.removeButton.bind(backendMenuController)
)

router.get(
  '/:id',
  idParamValidator,
  validate,
  backendMenuController.getDetail.bind(backendMenuController)
)

router.put(
  '/:id',
  updateMenuValidator,
  validate,
  backendMenuController.update.bind(backendMenuController)
)

router.delete(
  '/:id',
  idParamValidator,
  validate,
  backendMenuController.remove.bind(backendMenuController)
)

module.exports = router
