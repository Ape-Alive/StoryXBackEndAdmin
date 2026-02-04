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
 *     description: |
 *       终端用户查询自己的所有额度记录，支持按套餐筛选和分页查询。
 *
 *       **权限说明：**
 *       - 只能查询自己的额度记录
 *       - 用户ID从认证token中自动获取，无需手动传入
 *
 *       **额度说明：**
 *       - available：可用额度（积分），可以使用的额度
 *       - frozen：冻结额度（积分），被冻结暂时不能使用的额度
 *       - used：已使用额度（积分），累计已使用的额度
 *       - total = available + frozen + used：总额度
 *
 *       **套餐关联：**
 *       - 每个额度记录可以关联一个套餐（packageId）
 *       - packageId为null表示默认额度（不关联特定套餐）
 *       - 如果用户订阅了多个套餐，会有多个额度记录
 *
 *       **筛选参数：**
 *       - packageId：可选，按套餐ID筛选，不传则返回所有套餐的额度
 *
 *       **返回数据：**
 *       - 包含额度详情和关联的套餐信息
 *       - 支持分页查询
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选（可选）。如果提供，只返回该套餐的额度；如果不提供，返回所有套餐的额度
 *         example: "clx123456789"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码（从1开始）
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量（最大100）
 *         example: 20
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
 *                         description: 额度记录ID
 *                         example: "clx987654321"
 *                       userId:
 *                         type: string
 *                         description: 用户ID
 *                         example: "clx111111111"
 *                       packageId:
 *                         type: string
 *                         nullable: true
 *                         description: 套餐ID，null表示默认额度（不关联特定套餐）
 *                         example: "clx123456789"
 *                       available:
 *                         type: number
 *                         format: decimal
 *                         description: 可用额度（积分），可以使用的额度
 *                         example: 5000.00
 *                       frozen:
 *                         type: number
 *                         format: decimal
 *                         description: 冻结额度（积分），被冻结暂时不能使用的额度
 *                         example: 1000.00
 *                       used:
 *                         type: number
 *                         format: decimal
 *                         description: 已使用额度（积分），累计已使用的额度
 *                         example: 4000.00
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 更新时间
 *                       package:
 *                         type: object
 *                         nullable: true
 *                         description: 关联的套餐信息（如果packageId不为null）
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             description: 套餐内部标识
 *                           displayName:
 *                             type: string
 *                             description: 套餐显示名称
 *                 total:
 *                   type: integer
 *                   description: 总记录数
 *                   example: 3
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                   example: 1
 *                 pageSize:
 *                   type: integer
 *                   description: 每页数量
 *                   example: 20
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
 *     description: |
 *       终端用户查询自己的额度详情，可以指定套餐查询特定套餐的额度，或不指定套餐查询默认额度。
 *
 *       **权限说明：**
 *       - 只能查询自己的额度详情
 *       - 用户ID从认证token中自动获取
 *
 *       **查询逻辑：**
 *       - 如果提供了packageId，查询该套餐的额度详情
 *       - 如果没有提供packageId（packageId为null），查询默认额度（不关联特定套餐的额度）
 *       - 如果查询的额度不存在，会返回404错误
 *
 *       **额度字段说明：**
 *       - available：可用额度（积分），当前可以使用的额度
 *       - frozen：冻结额度（积分），被冻结暂时不能使用的额度
 *       - used：已使用额度（积分），累计已使用的额度
 *       - total = available + frozen + used：总额度
 *
 *       **使用场景：**
 *       - 查看特定套餐的额度余额
 *       - 查看默认额度的余额
 *       - 在消费前检查可用额度是否充足
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID（可选）。如果提供，查询该套餐的额度详情；如果不提供，查询默认额度（packageId为null的额度）
 *         example: "clx123456789"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "My quota detail retrieved successfully"
 *               data:
 *                 id: "clx987654321"
 *                 userId: "clx111111111"
 *                 packageId: "clx123456789"
 *                 available: 5000.00
 *                 frozen: 1000.00
 *                 used: 4000.00
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 *                 updatedAt: "2024-01-15T00:00:00.000Z"
 *                 package:
 *                   id: "clx123456789"
 *                   name: "premium_monthly"
 *                   displayName: "高级套餐（月付）"
 *       404:
 *         description: 额度不存在（指定套餐的额度不存在或默认额度不存在）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *     description: |
 *       终端用户查询自己的详细使用统计，包括总体统计、按套餐统计、每日使用趋势等。
 *
 *       **权限说明：**
 *       - 只能查询自己的使用统计
 *       - 用户ID从认证token中自动获取
 *
 *       **统计内容：**
 *       - total：总体统计（总使用额度、总使用次数）
 *       - byPackage：按套餐统计（每个套餐的使用情况）
 *       - dailyUsage：每日使用趋势（按日期统计的使用情况）
 *
 *       **时间范围：**
 *       - startDate：开始时间（可选），ISO 8601格式，如 "2024-01-01T00:00:00.000Z"
 *       - endDate：结束时间（可选），ISO 8601格式，如 "2024-01-31T23:59:59.999Z"
 *       - 如果不提供时间范围，统计所有历史数据
 *
 *       **统计说明：**
 *       - 只统计额度使用记录（type='decrease'），不包括增加、冻结、解冻等操作
 *       - 统计的是实际消费的额度，用于分析使用习惯和消费趋势
 *
 *       **使用场景：**
 *       - 查看总体使用情况
 *       - 分析各套餐的使用占比
 *       - 查看每日使用趋势，了解使用高峰期
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间（可选），ISO 8601格式。如果不提供，统计所有历史数据
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间（可选），ISO 8601格式。如果不提供，统计到当前时间
 *         example: "2024-01-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "My usage statistics retrieved successfully"
 *               data:
 *                 total:
 *                   totalAmount: 15000.00
 *                   totalCount: 150
 *                 byPackage:
 *                   - packageId: "clx123456789"
 *                     packageName: "premium_monthly"
 *                     packageDisplayName: "高级套餐（月付）"
 *                     totalAmount: 10000.00
 *                     totalCount: 100
 *                   - packageId: null
 *                     packageName: null
 *                     packageDisplayName: "默认额度"
 *                     totalAmount: 5000.00
 *                     totalCount: 50
 *                 dailyUsage:
 *                   - date: "2024-01-01"
 *                     totalAmount: 500.00
 *                     totalCount: 5
 *                   - date: "2024-01-02"
 *                     totalAmount: 800.00
 *                     totalCount: 8
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
 *     description: |
 *       终端用户查询自己的使用趋势，按时间段（日/周/月）统计额度使用情况。
 *
 *       **权限说明：**
 *       - 只能查询自己的使用趋势
 *       - 用户ID从认证token中自动获取
 *
 *       **时间段类型（period）：**
 *       - day：按日统计，返回格式为 "YYYY-MM-DD"，如 "2024-01-01"
 *       - week：按周统计，返回格式为 "YYYY-WXX"，如 "2024-W01"（2024年第1周）
 *       - month：按月统计，返回格式为 "YYYY-MM"，如 "2024-01"
 *
 *       **筛选参数：**
 *       - packageId：可选，按套餐ID筛选，只统计该套餐的使用情况
 *       - startDate：可选，开始时间，ISO 8601格式
 *       - endDate：可选，结束时间，ISO 8601格式
 *       - period：可选，时间段类型，默认为 "day"
 *
 *       **统计说明：**
 *       - 只统计额度使用记录（type='decrease'），不包括增加、冻结、解冻等操作
 *       - 每个时间段返回该时间段内的总使用额度和总使用次数
 *       - 数据按时间段升序排列
 *
 *       **使用场景：**
 *       - 查看每日使用趋势，了解使用规律
 *       - 查看每周使用趋势，分析周度变化
 *       - 查看每月使用趋势，分析月度变化
 *       - 对比不同套餐的使用趋势
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID（可选）。如果提供，只统计该套餐的使用趋势；如果不提供，统计所有套餐的使用趋势
 *         example: "clx123456789"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间（可选），ISO 8601格式。如果不提供，统计所有历史数据
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间（可选），ISO 8601格式。如果不提供，统计到当前时间
 *         example: "2024-01-31T23:59:59.999Z"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: 时间段类型。day=按日统计，week=按周统计，month=按月统计
 *         example: "day"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "My usage trend retrieved successfully"
 *               data:
 *                 - period: "2024-01-01"
 *                   totalAmount: 500.00
 *                   totalCount: 5
 *                 - period: "2024-01-02"
 *                   totalAmount: 800.00
 *                   totalCount: 8
 *                 - period: "2024-01-03"
 *                   totalAmount: 600.00
 *                   totalCount: 6
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
 *     description: |
 *       终端用户查询自己的额度流水记录，支持多维度筛选和分页查询。
 *
 *       **权限说明：**
 *       - 只能查询自己的额度流水记录
 *       - 用户ID从认证token中自动获取
 *
 *       **流水类型（type）：**
 *       - increase：增加额度（如订阅套餐、管理员调整、订单支付等）
 *       - decrease：减少额度（如使用AI服务消费额度）
 *       - freeze：冻结额度（管理员冻结）
 *       - unfreeze：解冻额度（管理员解冻）
 *
 *       **筛选参数：**
 *       - packageId：可选，按套餐ID筛选，只返回该套餐的流水记录
 *       - type：可选，按流水类型筛选，只返回指定类型的流水记录
 *       - startDate：可选，开始时间，ISO 8601格式，只返回该时间之后的流水记录
 *       - endDate：可选，结束时间，ISO 8601格式，只返回该时间之前的流水记录
 *
 *       **返回数据：**
 *       - 包含流水记录的完整信息（类型、金额、前后余额、原因等）
 *       - 包含关联的套餐信息（如果有）
 *       - 包含关联的订单信息（如果是订单相关的流水）
 *       - 按创建时间降序排列（最新的在前）
 *       - 支持分页查询
 *
 *       **使用场景：**
 *       - 查看额度变动历史
 *       - 核对消费记录
 *       - 查看套餐订阅后的额度增加记录
 *       - 查看订单支付后的额度增加记录
 *     tags: [终端用户额度管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选（可选）。如果提供，只返回该套餐的流水记录；如果不提供，返回所有套餐的流水记录
 *         example: "clx123456789"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [increase, decrease, freeze, unfreeze]
 *         description: 流水类型筛选（可选）。increase=增加，decrease=减少，freeze=冻结，unfreeze=解冻
 *         example: "decrease"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间（可选），ISO 8601格式。只返回该时间之后的流水记录
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间（可选），ISO 8601格式。只返回该时间之前的流水记录
 *         example: "2024-01-31T23:59:59.999Z"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码（从1开始）
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量（最大100）
 *         example: 20
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
 *                   example: "My quota records retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 流水记录ID
 *                         example: "clx999888777"
 *                       userId:
 *                         type: string
 *                         description: 用户ID
 *                         example: "clx111111111"
 *                       packageId:
 *                         type: string
 *                         nullable: true
 *                         description: 套餐ID，null表示默认额度
 *                         example: "clx123456789"
 *                       orderId:
 *                         type: string
 *                         nullable: true
 *                         description: 订单ID（如果是订单相关的流水）
 *                         example: "clx555666777"
 *                       type:
 *                         type: string
 *                         enum: [increase, decrease, freeze, unfreeze]
 *                         description: 流水类型
 *                         example: "decrease"
 *                       amount:
 *                         type: number
 *                         format: decimal
 *                         description: 变动金额（积分）
 *                         example: 100.00
 *                       before:
 *                         type: number
 *                         format: decimal
 *                         description: 变动前余额（积分）
 *                         example: 5000.00
 *                       after:
 *                         type: number
 *                         format: decimal
 *                         description: 变动后余额（积分）
 *                         example: 4900.00
 *                       reason:
 *                         type: string
 *                         nullable: true
 *                         description: 变动原因
 *                         example: "AI服务调用消费"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       package:
 *                         type: object
 *                         nullable: true
 *                         description: 关联的套餐信息
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                       order:
 *                         type: object
 *                         nullable: true
 *                         description: 关联的订单信息（如果是订单相关的流水）
 *                         properties:
 *                           id:
 *                             type: string
 *                           orderNo:
 *                             type: string
 *                           status:
 *                             type: string
 *                 total:
 *                   type: integer
 *                   description: 总记录数
 *                   example: 150
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                   example: 1
 *                 pageSize:
 *                   type: integer
 *                   description: 每页数量
 *                   example: 20
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
