const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { query, param } = require('express-validator');

// 所有路由需要认证（终端用户）
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: 终端用户额度管理
 *   description: 终端用户查询和管理自己的额度相关接口
 */

/**
 * @swagger
 * /api/user/quotas:
 *   get:
 *     summary: 获取我的额度列表 [仅终端用户]
 *     description: 终端用户查询自己的所有额度记录
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选（可选）
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
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
 *                   example: "My quotas retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       packageId:
 *                         type: string
 *                         nullable: true
 *                       available:
 *                         type: number
 *                         format: decimal
 *                       frozen:
 *                         type: number
 *                         format: decimal
 *                       used:
 *                         type: number
 *                         format: decimal
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       package:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 */
router.get(
  '/',
  [
    query('packageId').optional().isString().withMessage('Package ID must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100')
  ],
  validate,
  quotaController.getMyQuotas.bind(quotaController)
);

/**
 * @swagger
 * /api/user/quotas/detail:
 *   get:
 *     summary: 获取我的额度详情 [仅终端用户]
 *     description: 终端用户查询自己的额度详情（可指定套餐）
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID（可选，不传则查询默认额度）
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
 *                   example: "My quota detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: 额度详情
 */
router.get(
  '/detail',
  [
    query('packageId').optional().isString().withMessage('Package ID must be a string')
  ],
  validate,
  quotaController.getMyQuotaDetail.bind(quotaController)
);

/**
 * @swagger
 * /api/user/quotas/usage:
 *   get:
 *     summary: 获取我的使用统计 [仅终端用户]
 *     description: 终端用户查询自己的详细使用统计（包括总体统计、按套餐统计、每日使用趋势等）
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间（可选）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间（可选）
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
 *                   example: "My usage statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: object
 *                       properties:
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *                         totalCount:
 *                           type: integer
 *                     byPackage:
 *                       type: array
 *                       items:
 *                         type: object
 *                     dailyUsage:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get(
  '/usage',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
  ],
  validate,
  quotaController.getMyUsageStatistics.bind(quotaController)
);

/**
 * @swagger
 * /api/user/quotas/usage/trend:
 *   get:
 *     summary: 获取我的使用趋势 [仅终端用户]
 *     description: 终端用户查询自己的使用趋势（按时间段统计）
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID（可选）
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间（可选）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间（可选）
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: 时间段类型（day=按日，week=按周，month=按月）
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/usage/trend',
  [
    query('packageId').optional().isString().withMessage('Package ID must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    query('period').optional().isIn(['day', 'week', 'month']).withMessage('Period must be day, week, or month')
  ],
  validate,
  quotaController.getMyUsageTrend.bind(quotaController)
);

/**
 * @swagger
 * /api/user/quota-records:
 *   get:
 *     summary: 获取我的额度流水 [仅终端用户]
 *     description: 终端用户查询自己的额度流水记录
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选（可选）
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [increase, decrease, freeze, unfreeze]
 *         description: 流水类型筛选（可选）
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间（可选）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间（可选）
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/records',
  [
    query('packageId').optional().isString().withMessage('Package ID must be a string'),
    query('type').optional().isIn(['increase', 'decrease', 'freeze', 'unfreeze']).withMessage('Type must be increase, decrease, freeze, or unfreeze'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100')
  ],
  validate,
  quotaController.getMyQuotaRecords.bind(quotaController)
);

module.exports = router;
