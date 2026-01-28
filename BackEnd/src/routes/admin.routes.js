const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getAdminsValidator,
    getAdminDetailValidator,
    createAdminValidator,
    updateAdminValidator,
    updateAdminStatusValidator,
    updateAdminRoleValidator,
    deleteAdminValidator,
    batchUpdateStatusValidator,
    batchDeleteValidator
} = require('../validators/admin.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/admins:
 *   get:
 *     summary: 获取管理员列表
 *     tags: [系统用户管理]
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
 *         name: adminId
 *         schema:
 *           type: string
 *         description: 管理员ID
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: 用户名（模糊搜索）
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: 邮箱（模糊搜索）
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, platform_admin, operator, risk_control, finance, read_only]
 *         description: 角色
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 状态
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
 *         name: lastLoginStart
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 最后登录开始日期
 *       - in: query
 *         name: lastLoginEnd
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 最后登录结束日期
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastLogin]
 *           default: createdAt
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
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           status:
 *                             type: string
 *                           lastLogin:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           operationLogCount:
 *                             type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getAdminsValidator,
    validate,
    adminController.getAdmins.bind(adminController)
);

/**
 * @swagger
 * /api/admins/{id}:
 *   get:
 *     summary: 获取管理员详情
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 管理员ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: 管理员不存在
 */
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getAdminDetailValidator,
    validate,
    adminController.getAdminDetail.bind(adminController)
);

/**
 * @swagger
 * /api/admins:
 *   post:
 *     summary: 创建管理员（仅 super_admin）
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: admin001
 *                 description: 用户名（3-20个字符，只能包含字母、数字和下划线）
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin001@example.com
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 50
 *                 example: password123
 *                 description: 密码（6-50个字符）
 *               role:
 *                 type: string
 *                 enum: [platform_admin, operator, risk_control, finance, read_only]
 *                 example: platform_admin
 *                 description: 角色（不能是 super_admin）
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *                 description: 状态
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 权限不足（非 super_admin）
 *       409:
 *         description: 用户名或邮箱已存在
 */
router.post(
    '/',
    authorize(ROLES.SUPER_ADMIN),
    createAdminValidator,
    validate,
    adminController.createAdmin.bind(adminController)
);

/**
 * @swagger
 * /api/admins/{id}:
 *   put:
 *     summary: 更新管理员信息（仅 super_admin）
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 管理员ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 description: 用户名（可选）
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱（可选）
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 50
 *                 description: 密码（可选）
 *               role:
 *                 type: string
 *                 enum: [platform_admin, operator, risk_control, finance, read_only]
 *                 description: 角色（可选，不能是 super_admin）
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: 状态（可选）
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 权限不足（非 super_admin）
 *       404:
 *         description: 管理员不存在
 *       409:
 *         description: 用户名或邮箱已存在
 */
router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN),
    updateAdminValidator,
    validate,
    adminController.updateAdmin.bind(adminController)
);

/**
 * @swagger
 * /api/admins/{id}/status:
 *   patch:
 *     summary: 更新管理员状态（仅 super_admin）
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 管理员ID
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
 *                 enum: [active, inactive]
 *                 example: inactive
 *                 description: 状态
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误（不能禁用自己或最后一个 super_admin）
 *       403:
 *         description: 权限不足（非 super_admin）
 *       404:
 *         description: 管理员不存在
 */
router.patch(
    '/:id/status',
    authorize(ROLES.SUPER_ADMIN),
    updateAdminStatusValidator,
    validate,
    adminController.updateAdminStatus.bind(adminController)
);

/**
 * @swagger
 * /api/admins/{id}/role:
 *   patch:
 *     summary: 更新管理员角色（仅 super_admin）
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 管理员ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [platform_admin, operator, risk_control, finance, read_only]
 *                 example: operator
 *                 description: 角色（不能是 super_admin）
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误（不能修改自己的角色或最后一个 super_admin 的角色）
 *       403:
 *         description: 权限不足（非 super_admin）
 *       404:
 *         description: 管理员不存在
 */
router.patch(
    '/:id/role',
    authorize(ROLES.SUPER_ADMIN),
    updateAdminRoleValidator,
    validate,
    adminController.updateAdminRole.bind(adminController)
);

/**
 * @swagger
 * /api/admins/{id}:
 *   delete:
 *     summary: 删除管理员（仅 super_admin）
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 管理员ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 请求参数错误（不能删除自己或最后一个 super_admin）
 *       403:
 *         description: 权限不足（非 super_admin）
 *       404:
 *         description: 管理员不存在
 */
router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN),
    deleteAdminValidator,
    validate,
    adminController.deleteAdmin.bind(adminController)
);

/**
 * @swagger
 * /api/admins/batch/status:
 *   patch:
 *     summary: 批量更新管理员状态（仅 super_admin）
 *     tags: [系统用户管理]
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
 *                 description: 管理员ID数组
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: inactive
 *                 description: 状态
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
 *                   message: Admin statuses updated successfully
 *                   data:
 *                     count: 2
 *       400:
 *         description: 请求参数错误（不能禁用自己或所有 super_admin）
 *       403:
 *         description: 权限不足（非 super_admin）
 */
router.patch(
    '/batch/status',
    authorize(ROLES.SUPER_ADMIN),
    batchUpdateStatusValidator,
    validate,
    adminController.batchUpdateStatus.bind(adminController)
);

/**
 * @swagger
 * /api/admins/batch:
 *   delete:
 *     summary: 批量删除管理员（仅 super_admin）
 *     tags: [系统用户管理]
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
 *                 description: 管理员ID数组
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
 *                   message: Admins deleted successfully
 *                   data:
 *                     count: 2
 *       400:
 *         description: 请求参数错误（不能删除自己或所有 super_admin）
 *       403:
 *         description: 权限不足（非 super_admin）
 */
router.delete(
    '/batch',
    authorize(ROLES.SUPER_ADMIN),
    batchDeleteValidator,
    validate,
    adminController.batchDelete.bind(adminController)
);

/**
 * @swagger
 * /api/admins/export:
 *   post:
 *     summary: 导出管理员数据
 *     tags: [系统用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminId:
 *                 type: string
 *                 description: 管理员ID（可选）
 *               username:
 *                 type: string
 *                 description: 用户名（可选）
 *               email:
 *                 type: string
 *                 description: 邮箱（可选）
 *               role:
 *                 type: string
 *                 enum: [super_admin, platform_admin, operator, risk_control, finance, read_only]
 *                 description: 角色（可选）
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: 状态（可选）
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: 创建开始日期（可选）
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: 创建结束日期（可选）
 *     responses:
 *       200:
 *         description: 导出成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post(
    '/export',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getAdminsValidator,
    validate,
    adminController.exportAdmins.bind(adminController)
);

module.exports = router;

