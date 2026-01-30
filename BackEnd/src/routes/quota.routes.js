const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, param, query } = require('express-validator');
const { ROLES } = require('../constants/roles');
const {
  freezeQuotaValidator,
  unfreezeQuotaValidator,
  setQuotaValidator,
  resetQuotaValidator,
  batchAdjustQuotaValidator,
  batchFreezeQuotaValidator,
  batchUnfreezeQuotaValidator,
  exportQuotasValidator,
  getQuotaStatisticsValidator
} = require('../validators/quota.validator');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/quotas:
 *   get:
 *     summary: 获取额度列表 [管理员]
 *     description: 管理员查询所有终端用户的额度列表
 *     tags: [额度管理（管理员）]
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
 *     summary: 获取用户的所有额度 [管理员]
 *     description: 管理员查询指定终端用户的所有额度记录
 *     tags: [额度管理（管理员）]
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
 *     summary: 获取用户额度详情 [管理员]
 *     description: 管理员查询指定终端用户的额度详情
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/users/:userId/detail',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    validate,
    quotaController.getUserQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/users/{userId}/adjust:
 *   patch:
 *     summary: 手动调整额度 [管理员]
 *     description: 管理员手动调整指定终端用户的额度
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 */
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
 * /api/quotas/{id}/freeze:
 *   patch:
 *     summary: 冻结额度 [管理员]
 *     description: 管理员手动冻结终端用户额度（将可用额度转移到冻结额度）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 额度记录ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: 冻结金额（必须大于0）
 *                 example: 100.00
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: 冻结原因
 *                 example: "违规操作，冻结额度"
 *     responses:
 *       200:
 *         description: 冻结成功
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
 *                   example: "Quota frozen successfully"
 *                 data:
 *                   type: object
 *                   description: 更新后的额度记录
 *       400:
 *         description: 可用额度不足
 *       404:
 *         description: 额度记录不存在
 */
router.patch(
    '/:id/freeze',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    freezeQuotaValidator,
    validate,
    quotaController.freezeQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/{id}/unfreeze:
 *   patch:
 *     summary: 解冻额度 [管理员]
 *     description: 管理员手动解冻终端用户额度（将冻结额度转移到可用额度）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 额度记录ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: 解冻金额（必须大于0）
 *                 example: 100.00
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: 解冻原因
 *                 example: "问题已解决，解冻额度"
 *     responses:
 *       200:
 *         description: 解冻成功
 */
router.patch(
    '/:id/unfreeze',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    unfreezeQuotaValidator,
    validate,
    quotaController.unfreezeQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/{id}:
 *   put:
 *     summary: 设置额度 [管理员]
 *     description: 管理员直接设置终端用户额度（覆盖现有值）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 额度记录ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               available:
 *                 type: number
 *                 format: decimal
 *                 description: 可用额度（可选）
 *                 example: 1000.00
 *               frozen:
 *                 type: number
 *                 format: decimal
 *                 description: 冻结额度（可选）
 *                 example: 0.00
 *               used:
 *                 type: number
 *                 format: decimal
 *                 description: 已使用额度（可选）
 *                 example: 0.00
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: 设置原因（必填）
 *                 example: "重置用户额度"
 *     responses:
 *       200:
 *         description: 设置成功
 */
router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    setQuotaValidator,
    validate,
    quotaController.setQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/{id}/reset:
 *   post:
 *     summary: 重置额度 [管理员]
 *     description: 重置终端用户额度（清零）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 额度记录ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: 重置原因
 *                 example: "用户违规，重置额度"
 *     responses:
 *       200:
 *         description: 重置成功
 */
router.post(
    '/:id/reset',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    resetQuotaValidator,
    validate,
    quotaController.resetQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/batch/adjust:
 *   patch:
 *     summary: 批量调整额度 [管理员]
 *     description: 批量调整多个终端用户的额度
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - quotaId
 *                     - amount
 *                   properties:
 *                     quotaId:
 *                       type: string
 *                       description: 额度记录ID
 *                       example: "clx123"
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                       description: 调整金额（正数为增加，负数为减少）
 *                       example: 100.00
 *                     reason:
 *                       type: string
 *                       maxLength: 500
 *                       description: 调整原因
 *                       example: "批量充值"
 *     responses:
 *       200:
 *         description: 批量调整完成
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
 *                   example: "Batch quota adjustment completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: array
 *                       description: 成功列表
 *                     failed:
 *                       type: array
 *                       description: 失败列表
 */
router.patch(
    '/batch/adjust',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    batchAdjustQuotaValidator,
    validate,
    quotaController.batchAdjustQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/batch/freeze:
 *   patch:
 *     summary: 批量冻结额度 [管理员]
 *     description: 批量冻结多个终端用户的额度
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - quotaId
 *                     - amount
 *                   properties:
 *                     quotaId:
 *                       type: string
 *                       description: 额度记录ID
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                       description: 冻结金额（必须大于0）
 *                     reason:
 *                       type: string
 *                       maxLength: 500
 *                       description: 冻结原因
 *     responses:
 *       200:
 *         description: 批量冻结完成
 */
router.patch(
    '/batch/freeze',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    batchFreezeQuotaValidator,
    validate,
    quotaController.batchFreezeQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/batch/unfreeze:
 *   patch:
 *     summary: 批量解冻额度 [管理员]
 *     description: 批量解冻多个终端用户的额度
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - quotaId
 *                     - amount
 *                   properties:
 *                     quotaId:
 *                       type: string
 *                       description: 额度记录ID
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                       description: 解冻金额（必须大于0）
 *                     reason:
 *                       type: string
 *                       maxLength: 500
 *                       description: 解冻原因
 *     responses:
 *       200:
 *         description: 批量解冻完成
 */
router.patch(
    '/batch/unfreeze',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    batchUnfreezeQuotaValidator,
    validate,
    quotaController.batchUnfreezeQuota.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/statistics:
 *   get:
 *     summary: 获取额度统计信息 [管理员]
 *     description: 管理员获取终端用户额度统计信息
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 终端用户ID（可选）
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID（可选）
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
 *                   example: "Quota statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAvailable:
 *                       type: number
 *                       format: decimal
 *                       description: 总可用额度
 *                       example: 100000.00
 *                     totalFrozen:
 *                       type: number
 *                       format: decimal
 *                       description: 总冻结额度
 *                       example: 5000.00
 *                     totalUsed:
 *                       type: number
 *                       format: decimal
 *                       description: 总已使用额度
 *                       example: 20000.00
 *                     totalQuota:
 *                       type: number
 *                       format: decimal
 *                       description: 总额度（可用+冻结+已使用）
 *                       example: 125000.00
 *                     terminalUserCount:
 *                       type: integer
 *                       description: 终端用户数量
 *                       example: 100
 *                     packageCount:
 *                       type: integer
 *                       description: 套餐数量
 *                       example: 10
 */
router.get(
    '/statistics',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    getQuotaStatisticsValidator,
    validate,
    quotaController.getQuotaStatistics.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/export:
 *   post:
 *     summary: 导出额度数据 [管理员]
 *     description: 管理员导出终端用户额度数据
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 终端用户ID（可选）
 *               packageId:
 *                 type: string
 *                 description: 套餐ID（可选）
 *               format:
 *                 type: string
 *                 enum: [excel, csv]
 *                 default: excel
 *                 description: 导出格式
 *     responses:
 *       200:
 *         description: 导出成功
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
 *                   example: "Quota data exported successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: 额度数据列表
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                     format:
 *                       type: string
 *                       description: 导出格式
 */
router.post(
    '/export',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE),
    exportQuotasValidator,
    validate,
    quotaController.exportQuotas.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/usage/trend:
 *   get:
 *     summary: 获取使用趋势统计 [管理员]
 *     description: 管理员按时间段统计额度使用趋势（支持按日/周/月统计）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 终端用户ID（可选）
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
 *         description: 开始时间
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
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
 *                   example: "Usage trend retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                         description: 时间段标识（如：2024-01-01, 2024-W01, 2024-01）
 *                       totalAmount:
 *                         type: number
 *                         format: decimal
 *                         description: 该时间段总使用额度
 *                       totalCount:
 *                         type: integer
 *                         description: 该时间段使用次数
 */
router.get(
    '/usage/trend',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    [
        query('userId').optional().isString().withMessage('User ID must be a string'),
        query('packageId').optional().isString().withMessage('Package ID must be a string'),
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        query('period').optional().isIn(['day', 'week', 'month']).withMessage('Period must be day, week, or month')
    ],
    validate,
    quotaController.getUsageTrend.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/usage/package-ranking:
 *   get:
 *     summary: 获取套餐使用排行 [管理员]
 *     description: 管理员统计套餐使用排行（按使用额度排序）
 *     tags: [额度管理（管理员）]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: 返回数量限制
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
 *                   example: "Package ranking retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       packageId:
 *                         type: string
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
 *                       totalAmount:
 *                         type: number
 *                         format: decimal
 *                         description: 总使用额度
 *                       totalCount:
 *                         type: integer
 *                         description: 使用次数
 */
router.get(
    '/usage/package-ranking',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    [
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    validate,
    quotaController.getPackageRanking.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/usage/user-ranking:
 *   get:
 *     summary: 获取用户使用排行 [管理员]
 *     description: 管理员统计终端用户使用排行（按使用额度排序）
 *     tags: [额度管理（管理员）]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: 返回数量限制
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
 *                   example: "User ranking retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       user:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                       totalAmount:
 *                         type: number
 *                         format: decimal
 *                         description: 总使用额度
 *                       totalCount:
 *                         type: integer
 *                         description: 使用次数
 */
router.get(
    '/usage/user-ranking',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    [
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    validate,
    quotaController.getUserRanking.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/usage/distribution:
 *   get:
 *     summary: 获取使用分布统计 [管理员]
 *     description: 管理员统计额度使用分布（按类型、时间段等）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 终端用户ID（可选）
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
 *                   example: "Usage distribution retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     byType:
 *                       type: array
 *                       description: 按类型统计
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [increase, decrease, freeze, unfreeze]
 *                           totalAmount:
 *                             type: number
 *                             format: decimal
 *                           totalCount:
 *                             type: integer
 *                     byPeriod:
 *                       type: object
 *                       description: 按时间段统计
 *                       properties:
 *                         today:
 *                           type: object
 *                           properties:
 *                             totalAmount:
 *                               type: number
 *                               format: decimal
 *                             totalCount:
 *                               type: integer
 *                         week:
 *                           type: object
 *                         month:
 *                           type: object
 *                         year:
 *                           type: object
 */
router.get(
    '/usage/distribution',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    [
        query('userId').optional().isString().withMessage('User ID must be a string'),
        query('packageId').optional().isString().withMessage('Package ID must be a string'),
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
    ],
    validate,
    quotaController.getUsageDistribution.bind(quotaController)
);

/**
 * @swagger
 * /api/quotas/users/{userId}/usage:
 *   get:
 *     summary: 获取用户详细使用统计 [管理员]
 *     description: 管理员获取指定终端用户的详细使用统计（包括总体统计、按套餐统计、每日使用趋势等）
 *     tags: [额度管理（管理员）]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 终端用户ID
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
 *                   example: "User usage statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: object
 *                       properties:
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *                           description: 总使用额度
 *                         totalCount:
 *                           type: integer
 *                           description: 总使用次数
 *                     byPackage:
 *                       type: array
 *                       description: 按套餐统计
 *                       items:
 *                         type: object
 *                         properties:
 *                           packageId:
 *                             type: string
 *                           package:
 *                             type: object
 *                             nullable: true
 *                           totalAmount:
 *                             type: number
 *                             format: decimal
 *                           totalCount:
 *                             type: integer
 *                     dailyUsage:
 *                       type: array
 *                       description: 每日使用趋势（最近30天）
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           amount:
 *                             type: number
 *                             format: decimal
 *       404:
 *         description: 用户不存在或不是终端用户
 */
router.get(
    '/users/:userId/usage',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
    [
        param('userId').notEmpty().withMessage('User ID is required'),
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
    ],
    validate,
    quotaController.getUserUsageStatistics.bind(quotaController)
);

module.exports = router;
