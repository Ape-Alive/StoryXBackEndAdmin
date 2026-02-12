const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getOperationLogsValidator,
  getOperationLogDetailValidator,
  getAICallLogsValidator,
  getAICallLogDetailValidator
} = require('../validators/log.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/logs/operation:
 *   get:
 *     summary: 获取管理员操作日志列表
 *     description: |
 *       分页获取管理员操作日志，支持按管理员、操作类型、目标、结果、时间范围筛选。
 *       用于审计管理员在系统中的各类操作（创建、更新、删除等）。
 *       **权限**：需 super_admin、platform_admin、risk_control、finance 或 read_only 角色。
 *     tags: [日志审计]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量（最大100）
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *         description: 管理员ID筛选
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作类型（CREATE/UPDATE/DELETE/UPDATE_STATUS等）
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: 目标类型（user/model/package等）
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *         description: 目标ID
 *       - in: query
 *         name: result
 *         schema:
 *           type: string
 *           enum: [success, failure]
 *         description: 操作结果
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期（ISO 8601）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期（ISO 8601）
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OperationLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未认证
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
  '/operation',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY),
  getOperationLogsValidator,
  validate,
  logController.getOperationLogs.bind(logController)
);

/**
 * @swagger
 * /api/logs/operation/{id}:
 *   get:
 *     summary: 获取操作日志详情
 *     description: 根据日志ID获取单条管理员操作日志的详细信息
 *     tags: [日志审计]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 日志ID（cuid）
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation log detail retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/OperationLog'
 *       404:
 *         description: 日志不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未认证
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
  '/operation/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY),
  getOperationLogDetailValidator,
  validate,
  logController.getOperationLogDetail.bind(logController)
);

/**
 * @swagger
 * /api/logs/ai:
 *   get:
 *     summary: 获取 AI 调用日志列表
 *     description: |
 *       分页获取 AI 模型调用日志，支持按用户、模型、状态、请求ID、时间范围筛选。
 *       用于审计终端用户的 AI 调用记录，含 token 消耗、成本、耗时等。
 *       **权限**：需 super_admin、platform_admin、risk_control、finance 或 read_only 角色。
 *     tags: [日志审计]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量（最大100）
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选
 *       - in: query
 *         name: modelId
 *         schema:
 *           type: string
 *         description: 模型ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure]
 *         description: 调用状态
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *         description: 请求ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期（ISO 8601）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期（ISO 8601）
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AICallLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未认证
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
  '/ai',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY),
  getAICallLogsValidator,
  validate,
  logController.getAICallLogs.bind(logController)
);

/**
 * @swagger
 * /api/logs/ai/{requestId}:
 *   get:
 *     summary: 获取 AI 调用日志详情
 *     description: 根据请求ID获取单条 AI 调用日志的详细信息
 *     tags: [日志审计]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: 请求ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: AI call log detail retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/AICallLog'
 *       404:
 *         description: 日志不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未认证
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
  '/ai/:requestId',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY),
  getAICallLogDetailValidator,
  validate,
  logController.getAICallLogDetail.bind(logController)
);

module.exports = router;
