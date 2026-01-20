const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, param, query } = require('express-validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/quotas:
 *   get:
 *     summary: 获取额度列表
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    quotaController.getQuotas.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/users/{userId}:
 *   get:
 *     summary: 获取用户的所有额度
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/users/:userId',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    validate,
    quotaController.getUserQuotas.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/users/{userId}/detail:
 *   get:
 *     summary: 获取用户额度详情
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 *   patch:
 *     summary: 手动调整额度
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/users/:userId/detail',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    validate,
    quotaController.getUserQuota.bind(quotaController)
);

router.patch(
    '/users/:userId/adjust',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        body('amount').optional().isFloat().withMessage('Amount must be a number'),
        body('calls').optional().isInt().withMessage('Calls must be an integer'),
        body('reason').optional().isString().withMessage('Reason must be a string')
    ],
    validate,
    quotaController.adjustQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/records:
 *   get:
 *     summary: 获取额度流水列表
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/records',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    quotaController.getQuotaRecords.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/records/{requestId}:
 *   get:
 *     summary: 根据 requestId 查询流水
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/records/:requestId',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    validate,
    quotaController.getRecordsByRequestId.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/records/export:
 *   post:
 *     summary: 导出额度流水
 *     tags: [额度管理]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    '/records/export',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE),
    quotaController.exportQuotaRecords.bind(quotaController)
);

module.exports = router;
