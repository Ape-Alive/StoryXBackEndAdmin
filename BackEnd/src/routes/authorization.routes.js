const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/authorization.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES } = require('../constants/roles');
const {
  getAuthorizationsValidator,
  getAuthorizationDetailValidator,
  getByCallTokenValidator,
  revokeAuthorizationValidator,
  getUserAuthorizationStatsValidator,
  getAllUsersAuthorizationStatsValidator
} = require('../validators/authorization.validator');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/authorization:
 *   get:
 *     summary: 获取授权记录列表
 *     description: 获取授权记录列表，支持多种筛选条件和分页
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID（可选）
 *       - in: query
 *         name: modelId
 *         schema:
 *           type: string
 *         description: 模型ID（可选）
 *       - in: query
 *         name: callToken
 *         schema:
 *           type: string
 *         description: 调用令牌（可选）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked, expired, used]
 *         description: 授权状态（可选）
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *         description: 请求ID（可选）
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: 是否只返回活跃的授权（可选，true/false）
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期（可选，ISO 8601格式）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期（可选，ISO 8601格式）
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码（可选）
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量（可选）
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Authorization'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getAuthorizationsValidator,
    validate,
    authorizationController.getAuthorizations.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/stats:
 *   get:
 *     summary: 获取全部用户的授权统计（看板）
 *     description: |
 *       获取系统中所有用户的授权统计汇总信息，支持按设备指纹、用户ID、状态、日期范围筛选。
 *       用于授权统计看板：累计授权总量、今日新增、当前活跃授权、较昨日新增、去重用户总数、实时冻结额度、
 *       授权状态构成、活跃率、最近7天增长趋势、模型热度分析、高频授权排行等。
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceFingerprint
 *         schema:
 *           type: string
 *         description: 设备指纹（模糊搜索，可选）
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选（可选）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked, expired, used]
 *         description: 授权状态筛选（可选）
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期（可选，ISO 8601）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期（可选，ISO 8601）
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
 *                       description: 全部用户的授权统计信息
 *                       properties:
 *                         statusStats:
 *                           type: array
 *                           description: 按状态分组的统计信息
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                                 enum: [active, revoked, expired, used]
 *                                 description: 授权状态
 *                                 example: active
 *                               _count:
 *                                 type: integer
 *                                 description: 该状态下的授权数量
 *                                 example: 150
 *                           example:
 *                             - status: active
 *                               _count: 100
 *                             - status: revoked
 *                               _count: 30
 *                             - status: expired
 *                               _count: 20
 *                         total:
 *                           type: integer
 *                           description: 总授权数量（所有状态）
 *                           example: 500
 *                         last7DaysCount:
 *                           type: integer
 *                           description: 最近7天的授权数量
 *                           example: 80
 *                         last30DaysCount:
 *                           type: integer
 *                           description: 最近30天的授权数量
 *                           example: 250
 *                         activeCount:
 *                           type: integer
 *                           description: 当前活跃授权数量（未过期且状态为active）
 *                           example: 75
 *                         totalFrozenQuota:
 *                           type: number
 *                           format: decimal
 *                           description: 当前冻结的额度总和（所有活跃授权的frozenQuota之和）
 *                           example: 1250.5
 *                         uniqueUsersCount:
 *                           type: integer
 *                           description: 有授权的用户总数（去重）
 *                           example: 120
 *                         newToday:
 *                           type: integer
 *                           description: 今日新增授权数
 *                           example: 24
 *                         newActiveComparedYesterday:
 *                           type: integer
 *                           description: 当前活跃授权较昨日同一时刻的新增数
 *                           example: 5
 *                         activeRate:
 *                           type: integer
 *                           description: 活跃率（百分比，0-100）
 *                           example: 24
 *                         trendLast7Days:
 *                           type: array
 *                           description: 最近7天每日授权数（授权增长趋势）
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 example: "2026-02-06"
 *                               dayLabel:
 *                                 type: string
 *                                 example: "周三"
 *                               count:
 *                                 type: integer
 *                                 example: 80
 *                         modelStats:
 *                           type: array
 *                           description: 按模型分组的统计（前10个，按数量降序，含模型名称，用于模型热度分析）
 *                           items:
 *                             type: object
 *                             properties:
 *                               modelId:
 *                                 type: string
 *                               modelName:
 *                                 type: string
 *                                 description: 模型内部名称
 *                               displayName:
 *                                 type: string
 *                                 description: 模型展示名
 *                               _count:
 *                                 type: integer
 *                           example:
 *                             - modelId: clx111222333
 *                               modelName: gpt-4o
 *                               displayName: GPT-4o
 *                               _count: 150
 *                         userStats:
 *                           type: array
 *                           description: 高频授权排行（前10个，含用户邮箱、授权额度占比）
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               nullable: true
 *                               phone:
 *                                 type: string
 *                               nullable: true
 *                               _count:
 *                                 type: integer
 *                                 description: 授权数量
 *                               quotaPercentage:
 *                                 type: integer
 *                                 description: 授权额度占比（百分比）
 *                           example:
 *                             - userId: clx123456789
 *                               email: admin@dev.com
 *                               _count: 58
 *                               quotaPercentage: 80
 *                         deviceStats:
 *                           type: array
 *                           description: 按设备分组的统计（前10个，按数量降序）
 *                           items:
 *                             type: object
 *                             properties:
 *                               deviceFingerprint:
 *                                 type: string
 *                                 description: 设备指纹
 *                                 example: device-fingerprint-123
 *                               _count:
 *                                 type: integer
 *                                 description: 该设备的授权数量
 *                                 example: 80
 *                           example:
 *                             - deviceFingerprint: device-fingerprint-123
 *                               _count: 80
 *                             - deviceFingerprint: device-fingerprint-456
 *                               _count: 60
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   message: All users authorization stats retrieved successfully
 *                   data:
 *                     statusStats:
 *                       - status: active
 *                         _count: 100
 *                       - status: revoked
 *                         _count: 30
 *                       - status: expired
 *                         _count: 20
 *                     total: 500
 *                     newToday: 24
 *                     last7DaysCount: 80
 *                     last30DaysCount: 250
 *                     activeCount: 120
 *                     newActiveComparedYesterday: 5
 *                     totalFrozenQuota: 1250.5
 *                     uniqueUsersCount: 120
 *                     activeRate: 24
 *                     trendLast7Days:
 *                       - date: "2026-02-06"
 *                         dayLabel: "周三"
 *                         count: 45
 *                       - date: "2026-02-07"
 *                         dayLabel: "周四"
 *                         count: 80
 *                     modelStats:
 *                       - modelId: clx111222333
 *                         _count: 150
 *                       - modelId: clx444555666
 *                         _count: 100
 *                     userStats:
 *                       - userId: clx123456789
 *                         _count: 50
 *                       - userId: clx987654321
 *                         _count: 40
 *                     deviceStats:
 *                       - deviceFingerprint: device-fingerprint-123
 *                         _count: 80
 *                       - deviceFingerprint: device-fingerprint-456
 *                         _count: 60
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足（需要 super_admin、platform_admin 或 read_only 角色）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    '/stats',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getAllUsersAuthorizationStatsValidator,
    validate,
    authorizationController.getAllUsersAuthorizationStats.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/{id}:
 *   get:
 *     summary: 获取授权记录详情
 *     description: 根据授权ID获取授权记录的详细信息
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 授权记录ID
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
 *                       $ref: '#/components/schemas/AuthorizationDetail'
 *       404:
 *         description: 授权记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: 撤销授权
 *     description: 撤销指定的授权记录，如果授权是活跃状态且有冻结额度，会自动释放冻结的额度
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 授权记录ID
 *     responses:
 *       200:
 *         description: 撤销成功
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
 *                         success:
 *                           type: boolean
 *                           example: true
 *                         refundedQuota:
 *                           type: number
 *                           description: 释放的额度
 *                           example: 10.5
 *       404:
 *         description: 授权记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getAuthorizationDetailValidator,
    validate,
    authorizationController.getAuthorizationDetail.bind(authorizationController)
);

router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    revokeAuthorizationValidator,
    validate,
    authorizationController.revokeAuthorization.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/call-token/{callToken}:
 *   get:
 *     summary: 根据 callToken 获取授权记录
 *     description: 根据调用令牌（callToken）获取授权记录的详细信息
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callToken
 *         required: true
 *         schema:
 *           type: string
 *         description: 调用令牌
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
 *                       $ref: '#/components/schemas/AuthorizationDetail'
 *       404:
 *         description: 授权记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    '/call-token/:callToken',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getByCallTokenValidator,
    validate,
    authorizationController.getByCallToken.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/users/{userId}/stats:
 *   get:
 *     summary: 获取用户授权统计
 *     description: |
 *       获取指定用户的详细授权统计信息，包括：
 *       - 按状态分组的授权数量统计
 *       - 总授权数量
 *       - 最近7天和30天的授权数量
 *       - 当前活跃授权数量（未过期且状态为active）
 *       - 当前冻结的额度总和
 *       - 按模型分组的统计（前10个）
 *       - 按设备分组的统计（前10个）
 *       
 *       该接口用于管理员查看用户的授权使用情况，帮助分析用户行为和使用模式。
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *         example: clx123456789
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
 *                       description: 用户授权统计信息
 *                       properties:
 *                         statusStats:
 *                           type: array
 *                           description: 按状态分组的统计信息
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                                 enum: [active, revoked, expired, used]
 *                                 description: 授权状态
 *                                 example: active
 *                               _count:
 *                                 type: integer
 *                                 description: 该状态下的授权数量
 *                                 example: 25
 *                           example:
 *                             - status: active
 *                               _count: 10
 *                             - status: revoked
 *                               _count: 5
 *                             - status: expired
 *                               _count: 8
 *                         total:
 *                           type: integer
 *                           description: 总授权数量（所有状态）
 *                           example: 50
 *                         last7DaysCount:
 *                           type: integer
 *                           description: 最近7天的授权数量
 *                           example: 15
 *                         last30DaysCount:
 *                           type: integer
 *                           description: 最近30天的授权数量
 *                           example: 35
 *                         activeCount:
 *                           type: integer
 *                           description: 当前活跃授权数量（未过期且状态为active）
 *                           example: 8
 *                         totalFrozenQuota:
 *                           type: number
 *                           format: decimal
 *                           description: 当前冻结的额度总和
 *                           example: 80.5
 *                         modelStats:
 *                           type: array
 *                           description: 按模型分组的统计（前10个）
 *                           items:
 *                             type: object
 *                             properties:
 *                               modelId:
 *                                 type: string
 *                               modelName:
 *                                 type: string
 *                               displayName:
 *                                 type: string
 *                               _count:
 *                                 type: integer
 *                         deviceStats:
 *                           type: array
 *                           description: 按设备分组的统计（前10个）
 *                           items:
 *                             type: object
 *                             properties:
 *                               deviceFingerprint:
 *                                 type: string
 *                               _count:
 *                                 type: integer
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    '/users/:userId/stats',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getUserAuthorizationStatsValidator,
    validate,
    authorizationController.getUserAuthorizationStats.bind(authorizationController)
);

module.exports = router;
