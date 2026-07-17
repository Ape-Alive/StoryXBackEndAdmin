const express = require('express')
const router = express.Router()
const activationCodeController = require('../controllers/activationCode.controller')
const { authenticate } = require('../middleware/auth')
const { requireAdminAccount } = require('../middleware/requireAdminAccount')
const { requireBackendMenuPermission } = require('../middleware/backendPermission')
const validate = require('../middleware/validate')
const {
  listActivationCodesValidator,
  idParamValidator,
  createActivationCodeValidator,
  updateActivationCodeValidator,
} = require('../validators/activationCode.validator')

router.use(authenticate)
router.use(requireAdminAccount)
router.use(requireBackendMenuPermission('activation-codes'))

router.get('/meta', activationCodeController.getMeta.bind(activationCodeController))
router.post(
  '/destroy-expired',
  activationCodeController.destroyExpired.bind(activationCodeController),
)
router.get(
  '/',
  listActivationCodesValidator,
  validate,
  activationCodeController.list.bind(activationCodeController),
)
router.get(
  '/:id',
  idParamValidator,
  validate,
  activationCodeController.getDetail.bind(activationCodeController),
)
router.post(
  '/',
  createActivationCodeValidator,
  validate,
  activationCodeController.create.bind(activationCodeController),
)
router.put(
  '/:id',
  updateActivationCodeValidator,
  validate,
  activationCodeController.update.bind(activationCodeController),
)
router.delete(
  '/:id',
  idParamValidator,
  validate,
  activationCodeController.remove.bind(activationCodeController),
)

module.exports = router
