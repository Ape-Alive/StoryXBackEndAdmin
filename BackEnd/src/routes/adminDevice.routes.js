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
 *     description: |
 *       管理员获取所有设备列表，支持多条件筛选、分页和排序。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、risk_control、read_only 可访问
 *       
 *       **筛选说明**：
 *       - 所有筛选参数都是可选的，可以组合使用
 *       - 支持精确匹配：deviceId、userId、deviceFingerprint、status、ipAddress
 *       - 支持时间范围筛选：lastUsedStart/lastUsedEnd（最后使用时间）、startDate/endDate（创建时间）
 *       
 *       **排序说明**：
 *       - 默认按最后使用时间降序排列（最近使用的在前）
 *       - 支持按创建时间或最后使用时间排序
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
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: 设备ID（精确匹配）
 *         example: "clx123456789"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID（精确匹配）
 *         example: "clx987654321"
 *       - in: query
 *         name: deviceFingerprint
 *         schema:
 *           type: string
 *         description: 设备指纹（精确匹配）
 *         example: "device_fingerprint_hash_12345"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked]
 *         description: 设备状态筛选（active=活跃，revoked=已撤销）
 *         example: "active"
 *       - in: query
 *         name: ipAddress
 *         schema:
 *           type: string
 *         description: IP地址（精确匹配）
 *         example: "192.168.1.100"
 *       - in: query
 *         name: lastUsedStart
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 最后使用开始时间（ISO 8601格式）
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: lastUsedEnd
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 最后使用结束时间（ISO 8601格式）
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建开始时间（ISO 8601格式）
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建结束时间（ISO 8601格式）
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastUsedAt]
 *           default: lastUsedAt
 *         description: 排序字段（createdAt=创建时间，lastUsedAt=最后使用时间）
 *         example: "lastUsedAt"
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序顺序（asc=升序，desc=降序）
 *         example: "desc"
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
 *                           user:
 *                             type: object
 *                             description: 用户信息
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 description: 用户ID
 *                               email:
 *                                 type: string
 *                                 format: email
 *                                 description: 用户邮箱
 *                                 example: "user@example.com"
 *                               phone:
 *                                 type: string
 *                                 nullable: true
 *                                 description: 用户手机号
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
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
 *     description: |
 *       管理员获取指定设备的详细信息，包括设备基本信息和关联用户信息。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、risk_control、read_only 可访问
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
 *                         user:
 *                           type: object
 *                           description: 用户信息
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: 用户ID
 *                             email:
 *                               type: string
 *                               format: email
 *                               description: 用户邮箱
 *                               example: "user@example.com"
 *                             phone:
 *                               type: string
 *                               nullable: true
 *                               description: 用户手机号
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 设备不存在
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
 *     description: |
 *       管理员更新设备信息，可以修改设备名称、备注和状态。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、risk_control 可访问
 *       
 *       **注意事项**：
 *       - 所有字段都是可选的，只传需要更新的字段
 *       - 更新操作会记录到操作日志中
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
 *               status:
 *                 type: string
 *                 enum: [active, revoked]
 *                 description: 设备状态（可选，active=活跃，revoked=已撤销）
 *                 example: "active"
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
 *                         status:
 *                           type: string
 *                           enum: [active, revoked]
 *                           description: 设备状态
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 设备不存在
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
 *     description: |
 *       管理员强制解绑设备，将设备状态设置为 revoked（已撤销）。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、risk_control 可访问
 *       
 *       **注意事项**：
 *       - 解绑后设备将无法继续使用
 *       - 操作会记录到操作日志中
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
 *                         status:
 *                           type: string
 *                           example: "revoked"
 *                           description: 设备状态（已撤销）
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 设备不存在
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
 *     description: |
 *       管理员恢复已撤销的设备，将设备状态从 revoked 改为 active（活跃）。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、risk_control 可访问
 *       
 *       **注意事项**：
 *       - 只能恢复状态为 revoked 的设备
 *       - 操作会记录到操作日志中
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
 *         description: 恢复成功
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
 *                         status:
 *                           type: string
 *                           example: "active"
 *                           description: 设备状态（活跃）
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: 更新时间
 *       400:
 *         description: 设备状态不是 revoked，无法恢复
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 设备不存在
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
 *     description: |
 *       管理员批量更新多个设备的状态。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、risk_control 可访问
 *       
 *       **注意事项**：
 *       - 可以批量将设备设置为 active 或 revoked
 *       - 操作会记录到操作日志中
 *       - 如果某个设备不存在，会跳过该设备继续处理其他设备
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
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 设备ID数组
 *                 example: ["clx123456789", "clx987654321"]
 *               status:
 *                 type: string
 *                 enum: [active, revoked]
 *                 description: 目标状态（active=活跃，revoked=已撤销）
 *                 example: "revoked"
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
 *                         count:
 *                           type: integer
 *                           description: 成功更新的设备数量
 *                           example: 2
 *                         failed:
 *                           type: integer
 *                           description: 更新失败的设备数量
 *                           example: 0
 *       400:
 *         description: 请求参数错误（ids为空或status无效）
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
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
 *     description: |
 *       管理员批量删除设备记录。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator 可访问
 *       
 *       **注意事项**：
 *       - 删除操作不可恢复
 *       - 操作会记录到操作日志中
 *       - 如果某个设备不存在，会跳过该设备继续处理其他设备
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
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 设备ID数组
 *                 example: ["clx123456789", "clx987654321"]
 *     responses:
 *       200:
 *         description: 删除成功
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
 *                         count:
 *                           type: integer
 *                           description: 成功删除的设备数量
 *                           example: 2
 *                         failed:
 *                           type: integer
 *                           description: 删除失败的设备数量
 *                           example: 0
 *       400:
 *         description: 请求参数错误（ids为空）
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足（需要 super_admin、platform_admin 或 operator）
 */
router.delete(
  '/batch',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
  batchDeleteValidator,
  validate,
  deviceController.batchDelete.bind(deviceController)
);

module.exports = router;

