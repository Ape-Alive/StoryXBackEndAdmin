const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getDevicesValidator,
  getDeviceDetailValidator,
  updateDeviceByAdminValidator,
  batchUpdateStatusValidator,
  batchDeleteValidator
} = require('../validators/device.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: 获取设备列表（管理员）
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
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: 设备ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID
 *       - in: query
 *         name: deviceFingerprint
 *         schema:
 *           type: string
 *         description: 设备指纹
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked]
 *         description: 设备状态
 *       - in: query
 *         name: ipAddress
 *         schema:
 *           type: string
 *         description: IP地址
 *       - in: query
 *         name: lastUsedStart
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 最后使用开始日期
 *       - in: query
 *         name: lastUsedEnd
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 最后使用结束日期
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建结束日期
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastUsedAt]
 *           default: lastUsedAt
 *         description: 排序字段
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序顺序
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
 *                           id: { type: 'string' }
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
 *                           user:
 *                             type: object
 *                             properties:
 *                               id: { type: 'string' }
 *                               email: { type: 'string' }
 *                               phone: { type: 'string', nullable: true }
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL, ROLES.READ_ONLY),
  getDevicesValidator,
  validate,
  deviceController.getDevices.bind(deviceController)
);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     summary: 获取设备详情（管理员）
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
 *                         user:
 *                           type: object
 *                           properties:
 *                             id: { type: 'string' }
 *                             email: { type: 'string' }
 *                             phone: { type: 'string', nullable: true }
 */
router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL, ROLES.READ_ONLY),
  getDeviceDetailValidator,
  validate,
  deviceController.getDeviceDetail.bind(deviceController)
);

/**
 * @swagger
 * /api/devices/{id}:
 *   patch:
 *     summary: 更新设备信息（管理员）
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
 *               name: { type: 'string', maxLength: 50, description: '设备名称（可选）' }
 *               remark: { type: 'string', maxLength: 200, description: '备注（可选）' }
 *               status: { type: 'string', enum: ['active', 'revoked'], description: '设备状态（可选）' }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL),
  updateDeviceByAdminValidator,
  validate,
  deviceController.updateDeviceByAdmin.bind(deviceController)
);

/**
 * @swagger
 * /api/devices/{id}/revoke:
 *   post:
 *     summary: 强制解绑设备（管理员）
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
 */
router.post(
  '/:id/revoke',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL),
  getDeviceDetailValidator,
  validate,
  deviceController.revokeDeviceByAdmin.bind(deviceController)
);

/**
 * @swagger
 * /api/devices/{id}/allow:
 *   post:
 *     summary: 恢复设备（管理员）
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
 *         description: 恢复成功
 */
router.post(
  '/:id/allow',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL),
  getDeviceDetailValidator,
  validate,
  deviceController.allowDevice.bind(deviceController)
);

/**
 * @swagger
 * /api/devices/batch/status:
 *   patch:
 *     summary: 批量更新设备状态（管理员）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *               - status
 *             properties:
 *               ids: { type: 'array', items: { type: 'string' } }
 *               status: { type: 'string', enum: ['active', 'revoked'] }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch(
  '/batch/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.RISK_CONTROL),
  batchUpdateStatusValidator,
  validate,
  deviceController.batchUpdateStatus.bind(deviceController)
);

/**
 * @swagger
 * /api/devices/batch:
 *   delete:
 *     summary: 批量删除设备（管理员）
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids: { type: 'array', items: { type: 'string' } }
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete(
  '/batch',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
  batchDeleteValidator,
  validate,
  deviceController.batchDelete.bind(deviceController)
);

module.exports = router;

