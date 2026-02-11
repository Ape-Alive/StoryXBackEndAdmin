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
 *     description: |
 *       终端用户获取自己的设备列表，支持分页和状态筛选。
 *       
 *       **权限说明**：
 *       - 需要终端用户认证（user 或 basic_user 角色）
 *       - 只能查看自己的设备
 *       
 *       **筛选说明**：
 *       - status 参数可选，用于筛选设备状态（active=活跃，revoked=已撤销）
 *       - 默认返回所有设备，按最后使用时间降序排列
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码（从1开始）
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量（最大100）
 *         example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked]
 *         description: 设备状态筛选（可选，active=仅活跃设备，revoked=仅已撤销设备）
 *         example: "active"
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
 *                           id:
 *                             type: string
 *                             description: 设备ID
 *                             example: "clx123456789"
 *                           userId:
 *                             type: string
 *                             description: 用户ID
 *                             example: "clx987654321"
 *                           deviceFingerprint:
 *                             type: string
 *                             description: 设备指纹
 *                             example: "device_fingerprint_hash_12345"
 *                           name:
 *                             type: string
 *                             nullable: true
 *                             description: 设备名称（用户自定义）
 *                             example: "我的电脑"
 *                           remark:
 *                             type: string
 *                             nullable: true
 *                             description: 备注
 *                             example: "公司办公电脑"
 *                           ipAddress:
 *                             type: string
 *                             nullable: true
 *                             description: IP地址
 *                             example: "192.168.1.100"
 *                           region:
 *                             type: string
 *                             nullable: true
 *                             description: 地区
 *                             example: "北京"
 *                           status:
 *                             type: string
 *                             enum: [active, revoked]
 *                             description: 设备状态（active=活跃，revoked=已撤销）
 *                             example: "active"
 *                           lastUsedAt:
 *                             type: string
 *                             format: date-time
 *                             description: 最后使用时间
 *                             example: "2024-01-15T10:30:00Z"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 创建时间
 *                             example: "2024-01-01T08:00:00Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             description: 更新时间
 *                             example: "2024-01-15T10:30:00Z"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: 未认证或token无效
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
 *     description: |
 *       终端用户获取自己的设备数量限制信息，包括最大设备数量、已绑定设备数量和剩余槽位。
 *       
 *       **权限说明**：
 *       - 需要终端用户认证（user 或 basic_user 角色）
 *       
 *       **设备限制说明**：
 *       - 设备限制由用户套餐的 maxDevices 字段决定
 *       - 如果用户有多个套餐，使用优先级最高的套餐的限制
 *       - 如果 maxDevices 为 null，表示无限制
 *       - remainingSlots = maxDevices - boundDevicesCount（如果 maxDevices 不为 null）
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
 *                         maxDevices:
 *                           type: integer
 *                           nullable: true
 *                           description: 最大设备数量（null表示无限）
 *                           example: 5
 *                         boundDevicesCount:
 *                           type: integer
 *                           description: 已绑定设备数量（包括活跃和已撤销的设备）
 *                           example: 3
 *                         remainingSlots:
 *                           type: integer
 *                           nullable: true
 *                           description: 剩余设备槽位（null表示无限）
 *                           example: 2
 *                         effectivePackage:
 *                           type: object
 *                           nullable: true
 *                           description: 生效的套餐信息（决定设备限制的套餐）
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: 套餐ID
 *                             name:
 *                               type: string
 *                               description: 套餐名称
 *                             displayName:
 *                               type: string
 *                               description: 套餐显示名称
 *                             priority:
 *                               type: integer
 *                               description: 套餐优先级
 *       401:
 *         description: 未认证或token无效
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
 *     description: |
 *       终端用户根据设备指纹获取当前设备的信息。
 *       
 *       **权限说明**：
 *       - 需要终端用户认证（user 或 basic_user 角色）
 *       - 只能查询自己的设备
 *       
 *       **使用场景**：
 *       - 客户端启动时检查当前设备是否已绑定
 *       - 获取当前设备的详细信息
 *     tags: [设备管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceFingerprint
 *         required: true
 *         schema:
 *           type: string
 *         description: 设备指纹（用于唯一标识设备）
 *         example: "device_fingerprint_hash_12345"
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
 *                         id:
 *                           type: string
 *                           description: 设备ID
 *                           example: "clx123456789"
 *                         userId:
 *                           type: string
 *                           description: 用户ID
 *                           example: "clx987654321"
 *                         deviceFingerprint:
 *                           type: string
 *                           description: 设备指纹
 *                           example: "device_fingerprint_hash_12345"
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           description: 设备名称（用户自定义）
 *                           example: "我的电脑"
 *                         remark:
 *                           type: string
 *                           nullable: true
 *                           description: 备注
 *                         ipAddress:
 *                           type: string
 *                           nullable: true
 *                           description: IP地址
 *                           example: "192.168.1.100"
 *                         region:
 *                           type: string
 *                           nullable: true
 *                           description: 地区
 *                         status:
 *                           type: string
 *                           enum: [active, revoked]
 *                           description: 设备状态（active=活跃，revoked=已撤销）
 *                           example: "active"
 *                         lastUsedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 最后使用时间
 *                           example: "2024-01-15T10:30:00Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: 创建时间
 *                           example: "2024-01-01T08:00:00Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *                           example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: 请求参数错误（deviceFingerprint 缺失）
 *       401:
 *         description: 未认证或token无效
 *       404:
 *         description: 设备不存在或不属于当前用户
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
 *     description: |
 *       终端用户获取指定设备的详细信息。
 *       
 *       **权限说明**：
 *       - 需要终端用户认证（user 或 basic_user 角色）
 *       - 只能查看自己的设备
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
 *         example: "clx123456789"
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
 *                         id:
 *                           type: string
 *                           description: 设备ID
 *                           example: "clx123456789"
 *                         userId:
 *                           type: string
 *                           description: 用户ID
 *                           example: "clx987654321"
 *                         deviceFingerprint:
 *                           type: string
 *                           description: 设备指纹
 *                           example: "device_fingerprint_hash_12345"
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           description: 设备名称（用户自定义）
 *                           example: "我的电脑"
 *                         remark:
 *                           type: string
 *                           nullable: true
 *                           description: 备注
 *                           example: "公司办公电脑"
 *                         ipAddress:
 *                           type: string
 *                           nullable: true
 *                           description: IP地址
 *                           example: "192.168.1.100"
 *                         region:
 *                           type: string
 *                           nullable: true
 *                           description: 地区
 *                           example: "北京"
 *                         status:
 *                           type: string
 *                           enum: [active, revoked]
 *                           description: 设备状态（active=活跃，revoked=已撤销）
 *                           example: "active"
 *                         lastUsedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 最后使用时间
 *                           example: "2024-01-15T10:30:00Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: 创建时间
 *                           example: "2024-01-01T08:00:00Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *                           example: "2024-01-15T10:30:00Z"
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 设备不属于当前用户
 *       404:
 *         description: 设备不存在
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
 *     description: |
 *       终端用户更新自己设备的信息，可以修改设备名称和备注。
 *       
 *       **权限说明**：
 *       - 需要终端用户认证（user 或 basic_user 角色）
 *       - 只能更新自己的设备
 *       
 *       **注意事项**：
 *       - 只能更新 name 和 remark 字段
 *       - 不能更新设备状态（status），如需解绑设备请使用解绑接口
 *       - 所有字段都是可选的，只传需要更新的字段
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
 *         example: "clx123456789"
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
 *                 description: 设备名称（可选，最大50字符）
 *                 example: "我的电脑"
 *               remark:
 *                 type: string
 *                 maxLength: 200
 *                 description: 备注（可选，最大200字符）
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
 *                         id:
 *                           type: string
 *                           description: 设备ID
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           description: 设备名称
 *                         remark:
 *                           type: string
 *                           nullable: true
 *                           description: 备注
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *       400:
 *         description: 请求参数错误（字段长度超限）
 *       401:
 *         description: 未认证或token无效
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
 *     description: |
 *       终端用户解绑自己的设备，将设备状态设置为 revoked（已撤销）。
 *       
 *       **权限说明**：
 *       - 需要终端用户认证（user 或 basic_user 角色）
 *       - 只能解绑自己的设备
 *       
 *       **注意事项**：
 *       - 解绑后设备将无法继续使用
 *       - 解绑操作不可恢复（如需恢复需要联系管理员）
 *       - 解绑后设备仍会占用设备槽位（如果套餐有设备数量限制）
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
 *         example: "clx123456789"
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
 *                         id:
 *                           type: string
 *                           description: 设备ID
 *                           example: "clx123456789"
 *                         status:
 *                           type: string
 *                           example: "revoked"
 *                           description: 设备状态（已撤销）
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *                           example: "2024-01-15T10:30:00Z"
 *       401:
 *         description: 未认证或token无效
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

