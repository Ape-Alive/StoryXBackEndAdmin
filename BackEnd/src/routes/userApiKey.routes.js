const express = require('express');
const router = express.Router();
const userApiKeyController = require('../controllers/userApiKey.controller');
const { createUserApiKeyValidator } = require('../validators/userApiKey.validator');
const { authenticate } = require('../middleware/auth');
const { requireEntitlement } = require('../middleware/entitlement');
const { requireTerminalUser } = require('../middleware/terminalUser');
const { requireAnyClientPermission } = require('../middleware/clientPermission');
const { CLIENT_API_PERMISSIONS } = require('../constants/clientApiPermissions');
const validate = require('../middleware/validate');

router.use(authenticate);
router.use(requireTerminalUser);
router.use(requireEntitlement);
router.use(requireAnyClientPermission(...CLIENT_API_PERMISSIONS.API_KEY_MANAGE));

/**
 * @swagger
 * /api/user/api-keys:
 *   get:
 *     summary: 获取用户的API Key列表 [仅终端用户]
 *     tags: [终端用户API Key管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: 提供商ID（可选）
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [system_created, user_created]
 *         description: API Key类型（可选）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, revoked]
 *         description: 状态（可选）
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/',
  userApiKeyController.getUserApiKeys.bind(userApiKeyController)
);

/**
 * @swagger
 * /api/user/api-keys/{id}:
 *   get:
 *     summary: 获取API Key详情 [仅终端用户]
 *     tags: [终端用户API Key管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/:id',
  userApiKeyController.getApiKeyDetail.bind(userApiKeyController)
);

/**
 * @swagger
 * /api/user/api-keys:
 *   post:
 *     summary: 创建API Key [仅终端用户]
 *     tags: [终端用户API Key管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: API Key名称（可选）
 *               expireTime:
 *                 type: string
 *                 format: date-time
 *                 description: 过期时间（可选，ISO格式或时间戳）
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
  '/',
  createUserApiKeyValidator,
  validate,
  userApiKeyController.createUserApiKey.bind(userApiKeyController)
);

/**
 * @swagger
 * /api/user/api-keys/{id}:
 *   delete:
 *     summary: 删除API Key [仅终端用户]
 *     tags: [终端用户API Key管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete(
  '/:id',
  userApiKeyController.deleteUserApiKey.bind(userApiKeyController)
);

module.exports = router;
