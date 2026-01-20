const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/logs/operation:
 *   get:
 *     summary: 获取管理员操作日志列表
 *     tags: [日志审计]
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
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作类型
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: 目标类型
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
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期
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
// 获取管理员操作日志列表（所有角色可查看）
router.get(
    '/operation',
    logController.getOperationLogs.bind(logController)
);

/**
 * @swagger
 * /api/logs/operation/{id}:
 *   get:
 *     summary: 获取操作日志详情
 *     tags: [日志审计]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 日志ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 日志不存在
 */
// 获取操作日志详情
router.get(
    '/operation/:id',
    logController.getOperationLogDetail.bind(logController)
);

/**
 * @swagger
 * /api/logs/ai:
 *   get:
 *     summary: 获取 AI 调用日志列表
 *     tags: [日志审计]
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
 *         name: modelId
 *         schema:
 *           type: string
 *         description: 模型ID
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
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期
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
// 获取 AI 调用日志列表
router.get(
    '/ai',
    logController.getAICallLogs.bind(logController)
);

/**
 * @swagger
 * /api/logs/ai/{requestId}:
 *   get:
 *     summary: 获取 AI 调用日志详情
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
 *       404:
 *         description: 日志不存在
 */
// 获取 AI 调用日志详情
router.get(
    '/ai/:requestId',
    logController.getAICallLogDetail.bind(logController)
);

module.exports = router;
