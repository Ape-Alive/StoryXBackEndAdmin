const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getUsersValidator,
    getUserDetailValidator,
    updateUserStatusValidator,
    unbindDeviceValidator
} = require('../validators/user.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [用户管理]
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
 *     tags: [用户管理]
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
 *               $ref: '#/components/schemas/Success'
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
 *     tags: [用户管理]
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
 *     summary: 获取用户设备列表
 *     tags: [用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
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
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
 *     summary: 强制解绑用户设备
 *     tags: [用户管理]
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
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: clx123456789
 *                 description: 设备ID
 *     responses:
 *       200:
 *         description: 解绑成功
 *       404:
 *         description: 设备不存在
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
 * /api/users/export:
 *   post:
 *     summary: 导出用户数据
 *     tags: [用户管理]
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
 *               $ref: '#/components/schemas/Success'
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
