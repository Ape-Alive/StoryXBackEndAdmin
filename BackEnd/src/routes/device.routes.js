const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getUserDevicesValidator,
  getDeviceDetailValidator,
  updateDeviceValidator,
  revokeDeviceValidator
} = require('../validators/device.validator');

// 所有路由需要认证（终端用户）
router.use(authenticate);

/**
 * @swagger
 * /api/user/devices:
 *   get:
 *     summary: 获取我的设备列表（终端用户）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked]
 *         description: 设备状态筛选
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: 'string', example: 'clx123456789' }
 *                           userId: { type: 'string' }
 *                           deviceFingerprint: { type: 'string' }
 *                           name: { type: 'string', nullable: true }
 *                           remark: { type: 'string', nullable: true }
 *                           ipAddress: { type: 'string', nullable: true }
 *                           region: { type: 'string', nullable: true }
 *                           status: { type: 'string', enum: ['active', 'revoked'] }
 *                           lastUsedAt: { type: 'string', format: 'date-time' }
 *                           createdAt: { type: 'string', format: 'date-time' }
 *                           updatedAt: { type: 'string', format: 'date-time' }
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get(
  '/',
  getUserDevicesValidator,
  validate,
  deviceController.getUserDevices.bind(deviceController)
);

/**
 * @swagger
 * /api/user/devices/limit:
 *   get:
 *     summary: 获取设备数量上限（终端用户）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         maxDevices: { type: 'integer', nullable: true, description: '最大设备数量，null表示无限' }
 *                         boundDevicesCount: { type: 'integer', description: '已绑定设备数量' }
 *                         remainingSlots: { type: 'integer', nullable: true, description: '剩余设备槽位，null表示无限' }
 *                         effectivePackage:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id: { type: 'string' }
 *                             name: { type: 'string' }
 *                             displayName: { type: 'string' }
 *                             priority: { type: 'integer' }
 */
router.get(
  '/limit',
  deviceController.getDeviceLimit.bind(deviceController)
);

/**
 * @swagger
 * /api/user/devices/current:
 *   get:
 *     summary: 获取当前设备信息（终端用户）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceFingerprint
 *         required: true
 *         schema:
 *           type: string
 *         description: 设备指纹
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: 'string' }
 *                         userId: { type: 'string' }
 *                         deviceFingerprint: { type: 'string' }
 *                         name: { type: 'string', nullable: true }
 *                         remark: { type: 'string', nullable: true }
 *                         ipAddress: { type: 'string', nullable: true }
 *                         region: { type: 'string', nullable: true }
 *                         status: { type: 'string', enum: ['active', 'revoked'] }
 *                         lastUsedAt: { type: 'string', format: 'date-time' }
 *                         createdAt: { type: 'string', format: 'date-time' }
 *                         updatedAt: { type: 'string', format: 'date-time' }
 */
router.get(
  '/current',
  deviceController.getCurrentDevice.bind(deviceController)
);

/**
 * @swagger
 * /api/user/devices/{id}:
 *   get:
 *     summary: 获取设备详情（终端用户）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 设备ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: 'string' }
 *                         userId: { type: 'string' }
 *                         deviceFingerprint: { type: 'string' }
 *                         name: { type: 'string', nullable: true }
 *                         remark: { type: 'string', nullable: true }
 *                         ipAddress: { type: 'string', nullable: true }
 *                         region: { type: 'string', nullable: true }
 *                         status: { type: 'string', enum: ['active', 'revoked'] }
 *                         lastUsedAt: { type: 'string', format: 'date-time' }
 *                         createdAt: { type: 'string', format: 'date-time' }
 *                         updatedAt: { type: 'string', format: 'date-time' }
 */
router.get(
  '/:id',
  getDeviceDetailValidator,
  validate,
  deviceController.getDeviceDetail.bind(deviceController)
);

/**
 * @swagger
 * /api/user/devices/{id}:
 *   patch:
 *     summary: 更新设备信息（终端用户）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 设备ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *                 description: 设备名称（可选）
 *                 example: "我的电脑"
 *               remark:
 *                 type: string
 *                 maxLength: 200
 *                 description: 备注（可选）
 *                 example: "公司办公电脑"
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: 'string' }
 *                         name: { type: 'string', nullable: true }
 *                         remark: { type: 'string', nullable: true }
 *                         updatedAt: { type: 'string', format: 'date-time' }
 *       403:
 *         description: 设备不属于当前用户
 *       404:
 *         description: 设备不存在
 */
router.patch(
  '/:id',
  updateDeviceValidator,
  validate,
  deviceController.updateDevice.bind(deviceController)
);

/**
 * @swagger
 * /api/user/devices/{id}/revoke:
 *   post:
 *     summary: 解绑设备（终端用户）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 设备ID
 *     responses:
 *       200:
 *         description: 解绑成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: 'string' }
 *                         status: { type: 'string', example: 'revoked' }
 *                         updatedAt: { type: 'string', format: 'date-time' }
 *       403:
 *         description: 设备不属于当前用户
 *       404:
 *         description: 设备不存在
 */
router.post(
  '/:id/revoke',
  revokeDeviceValidator,
  validate,
  deviceController.revokeDevice.bind(deviceController)
);

module.exports = router;

