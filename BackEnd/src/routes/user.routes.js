const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getUsersValidator,
    getUserDetailValidator,
    updateUserStatusValidator,
    unbindDeviceValidator,
    batchUpdateStatusValidator,
    batchUnbindDevicesValidator,
    updateUserValidator,
    batchDeleteUsersValidator
} = require('../validators/user.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [终端用户管理]
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
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: 邮箱
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: 手机号
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [normal, frozen, banned]
 *         description: 用户状态
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastLoginAt]
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
 *                           id:
 *                             type: string
 *                             example: clx123456789
 *                           email:
 *                             type: string
 *                             format: email
 *                             example: user@example.com
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                             example: "+8613800138000"
 *                           role:
 *                             type: string
 *                             enum: [basic_user, user]
 *                             example: basic_user
 *                           status:
 *                             type: string
 *                             enum: [normal, frozen, banned]
 *                             example: normal
 *                           banReason:
 *                             type: string
 *                             nullable: true
 *                           banUntil:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           lastLoginAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           currentPackage:
 *                             type: object
 *                             nullable: true
 *                             description: 当前套餐信息
 *                           deviceCount:
 *                             type: integer
 *                             example: 2
 *                             description: 设备数量
 *                           quotaRecordCount:
 *                             type: integer
 *                             example: 10
 *                             description: 额度记录数量
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
// 获取用户列表
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    getUsersValidator,
    validate,
    userController.getUsers.bind(userController)
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: 获取用户详情
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
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
 *                           example: clx123456789
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: user@example.com
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                         role:
 *                           type: string
 *                           enum: [basic_user, user]
 *                         status:
 *                           type: string
 *                           enum: [normal, frozen, banned]
 *                         banReason:
 *                           type: string
 *                           nullable: true
 *                         banUntil:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         packages:
 *                           type: array
 *                           description: 用户套餐列表
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               packageId:
 *                                 type: string
 *                               startedAt:
 *                                 type: string
 *                                 format: date-time
 *                               expiresAt:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               priority:
 *                                 type: integer
 *                               package:
 *                                 type: object
 *                                 description: 套餐详情
 *                         devices:
 *                           type: array
 *                           description: 用户设备列表（最多10个）
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               userId:
 *                                 type: string
 *                               fingerprint:
 *                                 type: string
 *                               ipAddress:
 *                                 type: string
 *                                 nullable: true
 *                               lastUsedAt:
 *                                 type: string
 *                                 format: date-time
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                         quotas:
 *                           type: array
 *                           description: 用户额度列表
 *                           items:
 *                             type: object
 *                         statistics:
 *                           type: object
 *                           description: 用户使用统计
 *                           properties:
 *                             callsLast7Days:
 *                               type: integer
 *                               description: 近7天调用次数
 *                             callsLast30Days:
 *                               type: integer
 *                               description: 近30天调用次数
 *                             tokenUsage:
 *                               type: array
 *                               description: Token使用趋势（按天）
 *                             modelDistribution:
 *                               type: array
 *                               description: 模型使用分布
 *                             costStatistics:
 *                               type: object
 *                               properties:
 *                                 last7Days:
 *                                   type: object
 *                                   description: 近7天成本统计
 *                                 last30Days:
 *                                   type: object
 *                                   description: 近30天成本统计
 *       404:
 *         description: 用户不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 获取用户详情
router.get(
    '/:userId',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    getUserDetailValidator,
    validate,
    userController.getUserDetail.bind(userController)
);

/**
 * @swagger
 * /api/users/{userId}/status:
 *   patch:
 *     summary: 更新用户状态
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [normal, frozen, banned]
 *                 example: frozen
 *                 description: 用户状态
 *               reason:
 *                 type: string
 *                 example: 违规操作
 *                 description: 状态变更原因
 *               banDuration:
 *                 type: integer
 *                 example: 7
 *                 description: 封禁天数（仅当status为banned时有效，null表示永久封禁）
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: User status updated successfully
 *                   data: null
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 用户不存在
 */
// 更新用户状态
router.patch(
    '/:userId/status',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    updateUserStatusValidator,
    validate,
    userController.updateUserStatus.bind(userController)
);

/**
 * @swagger
 * /api/users/{userId}/devices:
 *   get:
 *     summary: 获取用户设备列表（管理员）
 *     description: |
 *       管理员获取指定用户的所有设备列表，支持分页。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator、read_only 可访问
 *       
 *       **排序说明**：
 *       - 默认按最后使用时间降序排列（最近使用的在前）
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *         example: "clx987654321"
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
 *                           remark:
 *                             type: string
 *                             nullable: true
 *                             description: 备注
 *                           ipAddress:
 *                             type: string
 *                             nullable: true
 *                             description: IP地址
 *                             example: "192.168.1.100"
 *                           region:
 *                             type: string
 *                             nullable: true
 *                             description: 地区
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
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
// 获取用户设备列表
router.get(
    '/:userId/devices',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    getUserDetailValidator,
    validate,
    userController.getUserDevices.bind(userController)
);

/**
 * @swagger
 * /api/users/{userId}/devices:
 *   delete:
 *     summary: 强制解绑用户设备（管理员）
 *     description: |
 *       管理员强制解绑指定用户的设备，将设备状态设置为 revoked（已撤销）。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator 可访问
 *       
 *       **注意事项**：
 *       - 解绑后设备将无法继续使用
 *       - 操作会记录到操作日志中
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *         example: "clx987654321"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: "clx123456789"
 *                 description: 设备ID
 *     responses:
 *       200:
 *         description: 解绑成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Device unbound successfully
 *                   data: null
 *       400:
 *         description: 请求参数错误（deviceId 缺失）
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在或设备不存在
 */
// 强制解绑设备
router.delete(
    '/:userId/devices',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    unbindDeviceValidator,
    validate,
    userController.unbindDevice.bind(userController)
);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: 更新用户信息
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱（可选）
 *               phone:
 *                 type: string
 *                 description: 手机号（可选）
 *               role:
 *                 type: string
 *                 enum: [basic_user, user]
 *                 description: 角色（可选）
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
 *                         email:
 *                           type: string
 *                           format: email
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                         role:
 *                           type: string
 *                           enum: [basic_user, user]
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: 请求参数错误或邮箱/手机号已存在
 *       404:
 *         description: 用户不存在
 */
// 更新用户信息
router.put(
    '/:userId',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    updateUserValidator,
    validate,
    userController.updateUser.bind(userController)
);

/**
 * @swagger
 * /api/users/batch/status:
 *   patch:
 *     summary: 批量更新用户状态
 *     tags: [终端用户管理]
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
 *                 example: ["clx123456789", "clx987654321"]
 *                 description: 用户ID数组
 *               status:
 *                 type: string
 *                 enum: [normal, frozen, banned]
 *                 example: frozen
 *                 description: 用户状态
 *               reason:
 *                 type: string
 *                 example: 批量冻结违规用户
 *                 description: 状态变更原因（可选）
 *               banDuration:
 *                 type: integer
 *                 example: 7
 *                 description: 封禁天数（仅当status为banned时有效，null表示永久封禁）
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: User statuses updated successfully
 *                   data:
 *                     count: 2
 *       400:
 *         description: 请求参数错误
 */
// 批量更新用户状态
router.patch(
    '/batch/status',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    batchUpdateStatusValidator,
    validate,
    userController.batchUpdateStatus.bind(userController)
);

/**
 * @swagger
 * /api/users/{userId}/devices/batch:
 *   delete:
 *     summary: 批量解绑用户设备（管理员）
 *     description: |
 *       管理员批量强制解绑指定用户的多个设备，将设备状态设置为 revoked（已撤销）。
 *       
 *       **权限说明**：
 *       - super_admin、platform_admin、operator 可访问
 *       
 *       **注意事项**：
 *       - 解绑后设备将无法继续使用
 *       - 操作会记录到操作日志中
 *       - 如果某个设备不存在，会跳过该设备继续处理其他设备
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *         example: "clx987654321"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["clx123456789", "clx987654321"]
 *                 description: 设备ID数组（至少包含一个设备ID）
 *     responses:
 *       200:
 *         description: 解绑成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Devices unbound successfully
 *                   data:
 *                     count: 2
 *                     failed: 0
 *       400:
 *         description: 请求参数错误（deviceIds 为空或不是数组）
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
// 批量解绑设备
router.delete(
    '/:userId/devices/batch',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    batchUnbindDevicesValidator,
    validate,
    userController.batchUnbindDevices.bind(userController)
);

/**
 * @swagger
 * /api/users/batch:
 *   delete:
 *     summary: 批量删除用户
 *     tags: [终端用户管理]
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
 *                 example: ["clx123456789", "clx987654321"]
 *                 description: 用户ID数组
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Users deleted successfully
 *                   data:
 *                     count: 2
 *       400:
 *         description: 请求参数错误
 */
// 批量删除用户
router.delete(
    '/batch',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    batchDeleteUsersValidator,
    validate,
    userController.batchDeleteUsers.bind(userController)
);

/**
 * @swagger
 * /api/users/export:
 *   post:
 *     summary: 导出用户数据
 *     tags: [终端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 用户ID（可选）
 *               email:
 *                 type: string
 *                 description: 邮箱（可选）
 *               status:
 *                 type: string
 *                 enum: [normal, frozen, banned]
 *                 description: 用户状态（可选）
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: 开始日期（可选）
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: 结束日期（可选）
 *     responses:
 *       200:
 *         description: 导出成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: 用户数据列表
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                             format: email
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                           role:
 *                             type: string
 *                             enum: [basic_user, user]
 *                           status:
 *                             type: string
 *                             enum: [normal, frozen, banned]
 *                           banReason:
 *                             type: string
 *                             nullable: true
 *                           banUntil:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           lastLoginAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           packages:
 *                             type: array
 *                             description: 用户套餐列表
 *                           deviceCount:
 *                             type: integer
 *                             description: 设备数量
 */
// 导出用户数据
router.post(
    '/export',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    getUsersValidator,
    validate,
    userController.exportUsers.bind(userController)
);

module.exports = router;
