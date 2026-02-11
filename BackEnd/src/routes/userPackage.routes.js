const express = require('express');
const router = express.Router();
const userPackageController = require('../controllers/userPackage.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { publicApiLimiter } = require('../middleware/rateLimit');
const { body, param, query } = require('express-validator');

/**
 * @swagger
 * /api/user/packages/available:
 *   get:
 *     summary: 获取可订阅的套餐列表（公开接口，无需登录）
 *     tags: [套餐订阅]
 *     description: |
 *       公开接口，无需认证即可访问，用于客户端展示可订阅的套餐列表。
 *
 *       **安全防护：**
 *       - 已添加速率限制防护，每个IP地址在15分钟内最多允许300次请求
 *       - 超过限制将返回429状态码，响应中包含重试时间（retryAfter字段）
 *       - 使用真实IP地址识别（支持代理环境）
 *       - 建议前端添加缓存机制，避免频繁重复请求
 *
 *       **返回说明：**
 *       - 仅返回已启用（isActive=true）的套餐
 *       - 按优先级（priority）降序排列
 *       - 包含套餐的完整信息，包括有效期、额度、价格等
 *
 *       **筛选参数：**
 *       - type：按套餐类型筛选（free/paid/trial），可选
 *       - durationUnit：按有效期单位筛选（day/month/year/permanent），可选
 *
 *       **使用示例：**
 *       - 获取所有套餐：`GET /api/user/packages/available`
 *       - 获取付费套餐：`GET /api/user/packages/available?type=paid`
 *       - 获取按月计费的套餐：`GET /api/user/packages/available?durationUnit=month`
 *       - 获取永久套餐：`GET /api/user/packages/available?durationUnit=permanent`
 *       - 组合筛选（付费且按月）：`GET /api/user/packages/available?type=paid&durationUnit=month`
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [free, paid, trial]
 *         description: 套餐类型筛选。可选值：free（免费套餐）、paid（付费套餐）、trial（试用套餐）。不传则返回所有类型
 *         example: "paid"
 *       - in: query
 *         name: durationUnit
 *         schema:
 *           type: string
 *           enum: [day, month, year, permanent]
 *         description: |
 *           有效期单位筛选。可选值：
 *           - day：按天计费的套餐（durationUnit='day'）
 *           - month：按月计费的套餐（durationUnit='month'）
 *           - year：按年计费的套餐（durationUnit='year'）
 *           - permanent：永久套餐（duration和durationUnit都为null）
 *           不传则返回所有有效期单位的套餐。
 *           可与type参数组合使用，例如：?type=paid&durationUnit=month 表示获取付费且按月计费的套餐
 *         example: "month"
 *     responses:
 *       200:
 *         description: 获取成功
 *         headers:
 *           RateLimit-Limit:
 *             description: 速率限制窗口内的最大请求数
 *             schema:
 *               type: integer
 *               example: 300
 *           RateLimit-Remaining:
 *             description: 当前窗口内剩余的请求数
 *             schema:
 *               type: integer
 *               example: 295
 *           RateLimit-Reset:
 *             description: 速率限制重置时间（Unix时间戳，秒）
 *             schema:
 *               type: integer
 *               example: 1640995200
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
 *                             description: 套餐ID
 *                             example: "clx1234567890"
 *                           name:
 *                             type: string
 *                             description: 套餐内部标识（唯一）
 *                             example: "premium_monthly"
 *                           displayName:
 *                             type: string
 *                             description: 套餐显示名称
 *                             example: "高级套餐（月付）"
 *                           description:
 *                             type: string
 *                             nullable: true
 *                             description: 套餐描述
 *                             example: "包含10000积分，支持所有模型"
 *                           type:
 *                             type: string
 *                             enum: [free, paid, trial]
 *                             description: 套餐类型
 *                             example: "paid"
 *                           duration:
 *                             type: integer
 *                             nullable: true
 *                             description: 有效期数值，null表示永久
 *                             example: 30
 *                           durationUnit:
 *                             type: string
 *                             nullable: true
 *                             enum: [day, month, year]
 *                             description: 有效期单位：day（天）、month（月）、year（年），null表示永久
 *                             example: "month"
 *                           quota:
 *                             type: number
 *                             format: decimal
 *                             nullable: true
 *                             description: 额度（积分），null表示无限
 *                             example: 10000.00
 *                           price:
 *                             type: number
 *                             format: decimal
 *                             nullable: true
 *                             description: 套餐金额，免费套餐为null
 *                             example: 99.00
 *                           priceUnit:
 *                             type: string
 *                             nullable: true
 *                             enum: [CNY, USD]
 *                             description: 套餐金额单位
 *                             example: "CNY"
 *                           discount:
 *                             type: number
 *                             format: decimal
 *                             nullable: true
 *                             description: 套餐折扣（百分比，0-100）
 *                             example: 10.00
 *                           maxDevices:
 *                             type: integer
 *                             nullable: true
 *                             description: 最大设备数量，null表示无限
 *                             example: 5
 *                           availableModels:
 *                             type: array
 *                             nullable: true
 *                             items:
 *                               type: string
 *                             description: 可用模型ID列表，null或空数组表示所有模型都可用
 *                             example: ["model1", "model2"]
 *                           isStackable:
 *                             type: boolean
 *                             description: 是否可叠加（用户是否可以同时拥有多个该套餐）
 *                             example: false
 *                           priority:
 *                             type: integer
 *                             description: 优先级，数字越大优先级越高，用于排序
 *                             example: 10
 *                           isActive:
 *                             type: boolean
 *                             description: 是否启用
 *                             example: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 创建时间
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             description: 更新时间
 *       429:
 *         description: 请求过于频繁（速率限制）
 *         headers:
 *           RateLimit-Limit:
 *             description: 速率限制窗口内的最大请求数
 *             schema:
 *               type: integer
 *               example: 100
 *           RateLimit-Remaining:
 *             description: 当前窗口内剩余的请求数
 *             schema:
 *               type: integer
 *               example: 0
 *           RateLimit-Reset:
 *             description: 速率限制重置时间（Unix时间戳，秒）
 *             schema:
 *               type: integer
 *               example: 1640995200
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - retryAfter
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                   description: 请求是否成功
 *                 message:
 *                   type: string
 *                   example: "请求过于频繁，请稍后再试"
 *                   description: 错误消息
 *                 retryAfter:
 *                   type: integer
 *                   description: 重试时间（秒），表示多少秒后可以再次请求
 *                   example: 300
 *             example:
 *               success: false
 *               message: "请求过于频繁，请稍后再试"
 *               retryAfter: 300
 */
// 公开接口：获取可订阅套餐列表（无需认证，但需要速率限制）
router.get(
    '/available',
    publicApiLimiter, // 速率限制中间件
    [
        query('type').optional().isIn(['free', 'paid', 'trial']).withMessage('Invalid package type'),
        query('durationUnit').optional().isIn(['day', 'month', 'year', 'permanent']).withMessage('Invalid duration unit. Must be one of: day, month, year, permanent')
    ],
    validate,
    userPackageController.getAvailablePackages.bind(userPackageController)
);

// 其他路由需要认证（终端用户和管理员都可以访问）
router.use(authenticate);

/**
 * @swagger
 * /api/user/packages/subscribe:
 *   post:
 *     summary: 订阅套餐（终端用户）
 *     description: |
 *       终端用户订阅套餐接口。用户可以选择订阅免费套餐、试用套餐，或通过订单流程购买付费套餐。
 *
 *       **订阅规则：**
 *       - 只能订阅已启用（isActive=true）的套餐
 *       - 免费套餐和试用套餐可以直接订阅
 *       - 付费套餐必须通过订单流程购买，不能直接订阅（会返回400错误）
 *       - 如果套餐不可叠加（isStackable=false），且用户已有其他套餐，则不能订阅
 *       - 如果套餐可叠加（isStackable=true），用户可以同时拥有多个该套餐
 *
 *       **重新购买（续费）规则：**
 *       - 如果用户已订阅该套餐，但套餐已过期，允许重新购买（续费）
 *       - 如果用户已订阅该套餐，套餐未过期但积分已用完（available + frozen = 0），也允许重新购买（续费）
 *       - 重新购买时会更新套餐的开始时间和过期时间，并重新初始化用户额度
 *       - 重新购买时会重新创建API Key（如果提供商支持）
 *
 *       **订阅后的操作：**
 *       - 自动创建用户套餐关系（如果不存在）或更新现有关系（如果重新购买）
 *       - 根据套餐的有效期（duration和durationUnit）计算过期时间
 *       - 如果套餐有额度（quota），会自动初始化用户额度（重新购买时会重置或增加额度）
 *       - 如果套餐是永久套餐（duration为null），则过期时间也为null
 *
 *       **优先级说明：**
 *       - priority参数可选，如果不提供，则使用套餐的默认优先级（重新购买时保留原优先级）
 *       - 优先级用于多个套餐时的排序和选择
 *
 *       **注意事项：**
 *       - 如果用户已订阅该套餐且套餐未过期且还有积分，且套餐不可叠加，会返回409错误
 *       - 如果套餐已禁用，会返回404错误
 *       - 付费套餐必须通过创建订单的方式购买
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *             properties:
 *               packageId:
 *                 type: string
 *                 description: 套餐ID（从 /api/user/packages/available 接口获取）
 *                 example: "clx123456789"
 *               priority:
 *                 type: integer
 *                 description: 套餐优先级（可选，数字越大优先级越高，如果不提供则使用套餐默认优先级）
 *                 example: 10
 *     responses:
 *       201:
 *         description: 订阅成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Package subscribed successfully
 *               data:
 *                 id: "clx987654321"
 *                 userId: "clx111111111"
 *                 packageId: "clx123456789"
 *                 startedAt: "2024-01-01T00:00:00.000Z"
 *                 expiresAt: "2024-02-01T00:00:00.000Z"
 *                 priority: 10
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 *                 updatedAt: "2024-01-01T00:00:00.000Z"
 *                 package:
 *                   id: "clx123456789"
 *                   name: "premium_monthly"
 *                   displayName: "高级套餐（月付）"
 *                   type: "paid"
 *                   duration: 30
 *                   durationUnit: "day"
 *                   quota: 10000.00
 *       400:
 *         description: 请求参数错误或付费套餐必须通过订单流程购买
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               paidPackage:
 *                 value:
 *                   success: false
 *                   message: "Paid packages must be purchased through the order process. Please create an order first."
 *               invalidPackage:
 *                 value:
 *                   success: false
 *                   message: "Package is not available"
 *       404:
 *         description: 套餐不存在或已禁用
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: 已订阅该套餐且套餐未过期且还有积分，且套餐不可叠加
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               activePackage:
 *                 summary: 套餐未过期且还有积分
 *                 value:
 *                   success: false
 *                   message: "User already has this package and it is still active"
 *               notStackable:
 *                 summary: 套餐不可叠加
 *                 value:
 *                   success: false
 *                   message: "User already has this package and it is not stackable"
 */
router.post(
    '/subscribe',
    [
        body('packageId').notEmpty().withMessage('Package ID is required'),
        body('priority').optional().isInt().withMessage('Priority must be an integer')
    ],
    validate,
    userPackageController.subscribePackage.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/my-packages:
 *   get:
 *     summary: 获取我的套餐列表（终端用户）
 *     description: |
 *       获取当前登录用户的所有套餐列表，支持分页和筛选。
 *
 *       **筛选参数：**
 *       - activeOnly：是否只返回活跃套餐（未过期且已开始）
 *         - true：只返回活跃套餐（expiresAt为null或大于当前时间，且startedAt小于等于当前时间）
 *         - false：返回所有套餐（包括已过期和未开始的）
 *
 *       **返回数据：**
 *       - 包含套餐的完整信息（套餐详情、有效期、优先级等）
 *       - 包含套餐状态（status）和不可用原因（unavailableReason）
 *       - 包含积分信息（quotaInfo），如果套餐有积分配置
 *       - 按优先级（priority）降序排列
 *       - 支持分页查询
 *
 *       **套餐状态（status）说明：**
 *       - `active`：套餐可用（已开始、未过期、有积分或无需积分）
 *       - `expired`：套餐已过期
 *       - `no_quota`：积分已用完（套餐有积分配置但可用积分 <= 0）
 *       - `inactive`：套餐已禁用
 *       - `not_started`：套餐尚未开始（startedAt > 当前时间，通常不会出现）
 *
 *       **不可用原因（unavailableReason）说明：**
 *       - 当 `status` 为 `active` 时，`unavailableReason` 为 `null`
 *       - 当 `status` 为 `expired` 时，`unavailableReason` 为 `"套餐已过期"`
 *       - 当 `status` 为 `no_quota` 时，`unavailableReason` 为 `"积分已用完"`
 *       - 当 `status` 为 `inactive` 时，`unavailableReason` 为 `"套餐已禁用"`
 *       - 当 `status` 为 `not_started` 时，`unavailableReason` 为 `"套餐尚未开始"`
 *
 *       **积分信息（quotaInfo）说明：**
 *       - 如果套餐有积分配置（package.quota），返回积分详情
 *       - `available`：可用积分
 *       - `frozen`：冻结积分
 *       - `used`：已使用积分
 *       - `total`：套餐总积分
 *       - `remaining`：剩余积分（available + frozen）
 *       - 如果套餐没有积分配置，`quotaInfo` 为 `null`
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: 是否只返回活跃套餐。true表示只返回未过期且已开始的套餐，false表示返回所有套餐
 *         example: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码（从1开始）
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 20
 *         description: 每页数量（最大1000）
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 用户套餐ID
 *                         example: "clx987654321"
 *                       userId:
 *                         type: string
 *                         description: 用户ID
 *                       packageId:
 *                         type: string
 *                         description: 套餐ID
 *                       startedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 套餐开始时间
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: 套餐过期时间，null表示永久
 *                       priority:
 *                         type: integer
 *                         description: 优先级，数字越大优先级越高
 *                       status:
 *                         type: string
 *                         enum: [active, expired, no_quota, inactive, not_started]
 *                         description: |
 *                           套餐状态
 *                           - active：套餐可用
 *                           - expired：套餐已过期
 *                           - no_quota：积分已用完
 *                           - inactive：套餐已禁用
 *                           - not_started：套餐尚未开始
 *                         example: "active"
 *                       unavailableReason:
 *                         type: string
 *                         nullable: true
 *                         description: 不可用原因，当status为active时为null
 *                         example: null
 *                       quotaInfo:
 *                         type: object
 *                         nullable: true
 *                         description: 积分信息，如果套餐有积分配置则返回，否则为null
 *                         properties:
 *                           available:
 *                             type: number
 *                             description: 可用积分
 *                             example: 5000.00
 *                           frozen:
 *                             type: number
 *                             description: 冻结积分
 *                             example: 100.00
 *                           used:
 *                             type: number
 *                             description: 已使用积分
 *                             example: 4900.00
 *                           total:
 *                             type: number
 *                             description: 套餐总积分
 *                             example: 10000.00
 *                           remaining:
 *                             type: number
 *                             description: 剩余积分（available + frozen）
 *                             example: 5100.00
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       package:
 *                         type: object
 *                         description: 套餐详情
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [free, paid, trial]
 *                           duration:
 *                             type: integer
 *                             nullable: true
 *                           durationUnit:
 *                             type: string
 *                             nullable: true
 *                             enum: [day, month, year]
 *                           quota:
 *                             type: number
 *                             nullable: true
 *                           price:
 *                             type: number
 *                             nullable: true
 *                           maxDevices:
 *                             type: integer
 *                             nullable: true
 *                 total:
 *                   type: integer
 *                   description: 总记录数
 *                   example: 5
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                   example: 1
 *                 pageSize:
 *                   type: integer
 *                   description: 每页数量
 *                   example: 20
 *             examples:
 *               activePackage:
 *                 summary: 可用套餐（有积分）
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "clx987654321"
 *                       userId: "clx111111111"
 *                       packageId: "clx123456789"
 *                       startedAt: "2024-01-01T00:00:00.000Z"
 *                       expiresAt: "2024-02-01T00:00:00.000Z"
 *                       priority: 10
 *                       status: "active"
 *                       unavailableReason: null
 *                       quotaInfo:
 *                         available: 5000.00
 *                         frozen: 100.00
 *                         used: 4900.00
 *                         total: 10000.00
 *                         remaining: 5100.00
 *                       package:
 *                         id: "clx123456789"
 *                         name: "premium_monthly"
 *                         displayName: "高级套餐（月付）"
 *                         quota: 10000.00
 *               expiredPackage:
 *                 summary: 已过期套餐
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "clx987654322"
 *                       userId: "clx111111111"
 *                       packageId: "clx123456790"
 *                       startedAt: "2023-12-01T00:00:00.000Z"
 *                       expiresAt: "2023-12-31T23:59:59.000Z"
 *                       priority: 5
 *                       status: "expired"
 *                       unavailableReason: "套餐已过期"
 *                       quotaInfo: null
 *                       package:
 *                         id: "clx123456790"
 *                         name: "trial_weekly"
 *                         displayName: "试用套餐（周）"
 *                         quota: 1000.00
 *               noQuotaPackage:
 *                 summary: 积分已用完的套餐
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "clx987654323"
 *                       userId: "clx111111111"
 *                       packageId: "clx123456791"
 *                       startedAt: "2024-01-01T00:00:00.000Z"
 *                       expiresAt: "2024-02-01T00:00:00.000Z"
 *                       priority: 8
 *                       status: "no_quota"
 *                       unavailableReason: "积分已用完"
 *                       quotaInfo:
 *                         available: 0.00
 *                         frozen: 0.00
 *                         used: 10000.00
 *                         total: 10000.00
 *                         remaining: 0.00
 *                       package:
 *                         id: "clx123456791"
 *                         name: "basic_monthly"
 *                         displayName: "基础套餐（月付）"
 *                         quota: 10000.00
 */
router.get(
    '/my-packages',
    [
        query('activeOnly').optional().custom((value) => {
            if (value === 'true' || value === 'false' || value === true || value === false) {
                return true;
            }
            throw new Error('activeOnly must be a boolean');
        }),
        query('page').optional().isInt({ min: 1 }),
        query('pageSize').optional().isInt({ min: 1, max: 1000 })
    ],
    validate,
    userPackageController.getMyPackages.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/{id}:
 *   get:
 *     summary: 获取我的套餐详情（终端用户）
 *     description: |
 *       获取当前登录用户的指定套餐详情。
 *
 *       **权限验证：**
 *       - 只能查看自己的套餐详情
 *       - 如果套餐不属于当前用户，会返回404错误
 *
 *       **返回数据：**
 *       - 包含用户套餐的完整信息
 *       - 包含关联的套餐详情
 *       - 包含套餐的有效期、优先级等信息
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID（从 /api/user/packages/my-packages 接口获取）
 *         example: "clx987654321"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Package detail retrieved successfully
 *               data:
 *                 id: "clx987654321"
 *                 userId: "clx111111111"
 *                 packageId: "clx123456789"
 *                 startedAt: "2024-01-01T00:00:00.000Z"
 *                 expiresAt: "2024-02-01T00:00:00.000Z"
 *                 priority: 10
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 *                 updatedAt: "2024-01-01T00:00:00.000Z"
 *                 package:
 *                   id: "clx123456789"
 *                   name: "premium_monthly"
 *                   displayName: "高级套餐（月付）"
 *                   description: "包含10000积分，支持所有模型"
 *                   type: "paid"
 *                   duration: 30
 *                   durationUnit: "day"
 *                   quota: 10000.00
 *                   price: 99.00
 *                   priceUnit: "CNY"
 *                   maxDevices: 5
 *                   isStackable: false
 *                   priority: 10
 *                   isActive: true
 *       404:
 *         description: 套餐不存在或不属于当前用户
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    '/:id',
    [
        param('id').notEmpty().withMessage('User package ID is required')
    ],
    validate,
    userPackageController.getMyPackageDetail.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/{id}/renew:
 *   post:
 *     summary: 续费套餐（终端用户）
 *     description: |
 *       续费当前用户的套餐，延长套餐的有效期。
 *
 *       **续费规则：**
 *       - 只能续费自己的套餐
 *       - 如果套餐不存在或不属于当前用户，会返回404错误
 *       - 如果套餐没有有效期（永久套餐），不能续费，会返回400错误
 *       - 续费天数可以指定，也可以使用套餐的默认有效期
 *
 *       **续费天数计算：**
 *       - 如果提供了days参数，使用指定的天数
 *       - 如果没有提供days参数，使用套餐的duration和durationUnit计算天数
 *         - durationUnit='day'：直接使用duration
 *         - durationUnit='month'：duration * 30天
 *         - durationUnit='year'：duration * 365天
 *       - 如果套餐是永久套餐（duration为null），不能续费
 *
 *       **续费后的操作：**
 *       - 延长套餐的过期时间（expiresAt）
 *       - 如果套餐可叠加（isStackable=true）且有额度（quota），会增加用户额度
 *       - 如果套餐不可叠加，只延长有效期，不增加额度
 *
 *       **注意事项：**
 *       - 续费是在当前过期时间的基础上延长，不是从当前时间开始计算
 *       - 如果套餐已过期，续费后从当前时间开始计算新的有效期
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID（从 /api/user/packages/my-packages 接口获取）
 *         example: "clx987654321"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 description: 续费天数（可选，如果不提供则使用套餐的默认有效期）。例如：30表示延长30天
 *                 example: 30
 *     responses:
 *       200:
 *         description: 续费成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Package renewed successfully
 *               data:
 *                 id: "clx987654321"
 *                 userId: "clx111111111"
 *                 packageId: "clx123456789"
 *                 startedAt: "2024-01-01T00:00:00.000Z"
 *                 expiresAt: "2024-03-01T00:00:00.000Z"
 *                 priority: 10
 *                 updatedAt: "2024-01-15T00:00:00.000Z"
 *       400:
 *         description: 请求参数错误或套餐没有有效期不能续费
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Package has no duration, cannot renew"
 *       404:
 *         description: 套餐不存在或不属于当前用户
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/:id/renew',
    [
        param('id').notEmpty().withMessage('User package ID is required'),
        body('days').optional().isInt({ min: 1 }).withMessage('Days must be a positive integer')
    ],
    validate,
    userPackageController.renewPackage.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/{id}/unsubscribe:
 *   delete:
 *     summary: 取消订阅（终端用户）
 *     description: |
 *       取消订阅当前用户的套餐，删除用户套餐关系。
 *
 *       **取消订阅规则：**
 *       - 只能取消自己的套餐订阅
 *       - 如果套餐不存在或不属于当前用户，会返回404错误
 *       - 取消订阅后，用户套餐关系会被删除
 *       - 取消订阅不会影响已使用的额度，但会停止套餐的继续生效
 *
 *       **注意事项：**
 *       - 取消订阅是永久性的，无法恢复
 *       - 如果套餐已过期，取消订阅只是清理记录
 *       - 如果套餐还在有效期内，取消订阅后立即失效
 *       - 取消订阅不会退款，如需退款请通过订单流程处理
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID（从 /api/user/packages/my-packages 接口获取）
 *         example: "clx987654321"
 *     responses:
 *       200:
 *         description: 取消订阅成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Package unsubscribed successfully
 *               data: null
 *       404:
 *         description: 套餐不存在或不属于当前用户
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
    '/:id/unsubscribe',
    [
        param('id').notEmpty().withMessage('User package ID is required')
    ],
    validate,
    userPackageController.unsubscribePackage.bind(userPackageController)
);

module.exports = router;

