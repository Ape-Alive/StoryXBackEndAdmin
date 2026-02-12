const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getCallPointsTrendValidator,
  getRealtimeRiskTriggersValidator
} = require('../validators/dashboard.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RISK_CONTROL, ROLES.FINANCE, ROLES.READ_ONLY));

/**
 * @swagger
 * /api/dashboard/summary-metrics:
 *   get:
 *     summary: 获取大盘汇总指标
 *     description: 今日营收、新增用户、AI调用量、风险预警及昨日对比
 *     tags: [大盘仪表盘]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/summary-metrics',
  dashboardController.getSummaryMetrics.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/call-points-trend:
 *   get:
 *     summary: 获取调用与积分趋势
 *     description: 时间序列数据，支持 24h/7d/30d
 *     tags: [大盘仪表盘]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/call-points-trend',
  getCallPointsTrendValidator,
  validate,
  dashboardController.getCallPointsTrend.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/model-load-ratio:
 *   get:
 *     summary: 获取模型负载占比
 *     description: 各模型调用量占比
 *     tags: [大盘仪表盘]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/model-load-ratio',
  dashboardController.getModelLoadRatio.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/model-provider-health:
 *   get:
 *     summary: 获取提供商健康度
 *     description: 状态、剩余额度、延迟
 *     tags: [大盘仪表盘]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/model-provider-health',
  dashboardController.getModelProviderHealth.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/realtime-risk-triggers:
 *   get:
 *     summary: 获取最近风控触发记录
 *     description: 实时风控触发记录列表
 *     tags: [大盘仪表盘]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/realtime-risk-triggers',
  getRealtimeRiskTriggersValidator,
  validate,
  dashboardController.getRealtimeRiskTriggers.bind(dashboardController)
);

module.exports = router;
