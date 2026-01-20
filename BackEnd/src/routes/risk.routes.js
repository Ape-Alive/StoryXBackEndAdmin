const express = require('express');
const router = express.Router();
const riskController = require('../controllers/risk.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, param, query } = require('express-validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/risk/rules:
 *   get:
 *     summary: 获取风控规则列表
 *     tags: [风控监控]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: 创建风控规则
 *     tags: [风控监控]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/rules',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL, ROLES.READ_ONLY),
    riskController.getRules.bind(riskController)
);

router.post(
    '/rules',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL),
    [
        body('name').notEmpty().withMessage('Rule name is required'),
        body('action').isIn(['limit_rate', 'freeze_quota', 'ban_account', 'alert']).withMessage('Invalid action'),
        body('conditions').notEmpty().withMessage('Conditions are required')
    ],
    validate,
    riskController.createRule.bind(riskController)
);

/**
 * @swagger
 * /api/risk/rules/{id}:
 *   get:
 *     summary: 获取风控规则详情
 *     tags: [风控监控]
 *   put:
 *     summary: 更新风控规则
 *     tags: [风控监控]
 *   delete:
 *     summary: 删除风控规则
 *     tags: [风控监控]
 */
router.get(
    '/rules/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL, ROLES.READ_ONLY),
    validate,
    riskController.getRuleDetail.bind(riskController)
);

router.put(
    '/rules/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL),
    validate,
    riskController.updateRule.bind(riskController)
);

router.delete(
    '/rules/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL),
    validate,
    riskController.deleteRule.bind(riskController)
);

/**
 * @swagger
 * /api/risk/triggers:
 *   get:
 *     summary: 获取风控触发记录
 *     tags: [风控监控]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/triggers',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL, ROLES.READ_ONLY),
    riskController.getTriggers.bind(riskController)
);

/**
 * @swagger
 * /api/risk/monitor/stats:
 *   get:
 *     summary: 获取监控统计数据
 *     tags: [风控监控]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/monitor/stats',
    authorize(ROLES.SUPER_ADMIN, ROLES.RISK_CONTROL, ROLES.READ_ONLY),
    riskController.getMonitorStats.bind(riskController)
);

module.exports = router;
