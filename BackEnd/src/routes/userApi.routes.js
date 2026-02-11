const express = require('express');
const router = express.Router();
const userApiController = require('../controllers/userApi.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  requestAuthorizationValidator,
  reportCallValidator,
  getMyAuthorizationsValidator,
  getCallLogsValidator,
  getCallLogDetailValidator,
  cancelAuthorizationValidator
} = require('../validators/userApi.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证（终端用户）
router.use(authenticate);
router.use(authorize(ROLES.USER, ROLES.BASIC_USER));

/**
 * @swagger
 * tags:
 *   name: 终端用户AI调用
 *   description: 终端用户申请AI调用授权、上报调用结果、查看调用日志等接口
 */

/**
 * @swagger
 * /api/user/authorization/request:
 *   post:
 *     summary: 申请调用授权 [仅终端用户]
 *     description: |
 *       桌面端在调用AI服务前，需要先申请授权获取API密钥和调用令牌。
 *       
 *       **流程说明：**
 *       1. 验证设备指纹格式和状态
 *       2. 验证用户状态（必须为normal状态）
 *       3. 验证模型和提供商状态（必须为active）
 *       4. 检查用户套餐权限（套餐必须包含该模型）
 *       5. 检查设备数量限制（使用最高优先级套餐的maxDevices）
 *       6. 计算预估费用（根据模型的pricingType、maxToken和estimatedTokens）
 *       7. 预冻结额度（从优先级高的套餐开始冻结）
 *       8. 选择API Key（按优先级：用户专属 > 提供商关联 > 主账户Token）
 *       9. 生成callToken并返回AI密钥等信息
 *       
 *       **返回信息：**
 *       - apiKey：AI服务提供商的API密钥（按优先级选择，详见下方说明）
 *       - providerBaseUrl：提供商的基础URL（完整URL，如：https://api.deepseek.com）
 *       - modelBaseUrl：模型的接口路径（相对路径，如：/v1/chat/completions）
 *       - callToken：调用令牌，用于后续上报调用结果时验证授权
 *       - expiresAt：授权过期时间（默认10分钟）
 *       - frozenQuota：预冻结的额度（积分）
 *       - estimatedCost：预估费用（积分）
 *       - maxToken：模型的最大Token数（如果价格配置中设置了maxToken）
 *       - usedMaxToken：是否使用了maxToken进行费用预估
 *       
 *       **API Key选择优先级：**
 *       系统会按以下优先级选择API Key，返回第一个可用的：
 *       1. **用户专属API Key**（优先使用）
 *          - 优先使用 `user_created` 类型（用户自己创建的API Key）
 *          - 其次使用 `system_created` 类型（系统为用户自动创建的API Key）
 *          - 这些API Key的 `credits` 通常为0，使用用户内部额度系统
 *       2. **提供商关联的API Key**（`provider_associated` 类型）
 *          - 管理员手动添加的提供商关联API Key
 *          - 如果API Key有 `credits > 0`，需要检查提供商是否有足够积分（`provider.quota > 0`）
 *          - 如果提供商积分不足，会跳过该API Key，继续查找下一个
 *          - 如果API Key的 `credits = 0`（无限制），直接使用
 *       3. **提供商主账户Token**（`provider.mainAccountToken`）
 *          - 如果提供商设置了积分限制（`provider.quota` 不为null），需要检查 `provider.quota > 0`
 *          - 如果提供商积分不足，返回null（调用会失败）
 *          - 如果提供商没有设置积分限制（`provider.quota` 为null），可以使用
 *       
 *       **重要说明：**
 *       - 如果所有API Key都不可用（已过期、已禁用、提供商积分不足等），`apiKey` 可能返回 `null`
 *       - 客户端应该检查 `apiKey` 是否为 `null`，如果为 `null`，说明当前无法调用该模型
 *       - 提供商积分检查：对于有积分限制的API Key或主账户Token，系统会检查提供商的 `quota` 字段
 *       
 *       **注意事项：**
 *       - 授权有效期为10分钟，过期后需要重新申请
 *       - 预冻结的额度会在调用完成后根据实际消耗结算
 *       - 如果调用失败，预冻结的额度会全部退回
 *       - 设备指纹格式：8-255个字符，只能包含字母、数字、连字符和下划线
 *       - 如果设备被禁用，将无法申请授权
 *       - API Key选择失败时，`apiKey` 字段会返回 `null`，客户端应该检查并提示用户
 *       - 额度冻结优先级：从优先级高的套餐开始冻结，确保高优先级套餐的额度优先使用
 *       - 提供商积分检查：对于有积分限制的API Key或主账户Token，系统会检查提供商的 `quota` 字段
 *         * 如果 `quota > 0`：可以使用
 *         * 如果 `quota <= 0`：不能使用，会继续查找下一个可用的API Key
 *         * 如果 `quota` 为 `null`：表示无限制，可以使用
 *       
 *       **费用预估说明：**
 *       - 对于按Token计价的模型（pricingType=token）：
 *         * 如果模型价格配置中设置了maxToken，预估费用会优先使用maxToken计算（即使estimatedTokens更大）
 *         * 如果模型价格配置中maxToken为null，使用estimatedTokens计算
 *         * 如果未提供estimatedTokens且maxToken为null，默认按1个token计算
 *       - 对于按调用次数计价的模型（pricingType=call）：
 *         * 直接使用callPrice作为预估费用
 *         * estimatedTokens和maxToken不影响费用计算
 *       
 *       **使用示例：**
 *       ```bash
 *       curl -X POST http://localhost:5800/api/user/authorization/request \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "modelId": "clx123456789",
 *           "deviceFingerprint": "device_hash_abc123",
 *           "estimatedTokens": 1000
 *         }'
 *       ```
 *     tags: [终端用户AI调用]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - modelId
 *               - deviceFingerprint
 *             properties:
 *               modelId:
 *                 type: string
 *                 example: "clx123456789"
 *                 description: 模型ID
 *               deviceFingerprint:
 *                 type: string
 *                 example: "device_hash_abc123"
 *                 description: 设备指纹，用于设备识别和限制
 *               estimatedTokens:
 *                 type: integer
 *                 example: 1000
 *                 description: |
 *                   预估的token数量（可选），用于计算预估费用和预冻结额度
 *                   
 *                   **计费策略：**
 *                   - 如果模型价格配置中设置了 `maxToken`，则优先使用 `maxToken` 计算费用（即使 `estimatedTokens` 更大）
 *                   - 如果模型价格配置中 `maxToken` 为 `null`，则使用 `estimatedTokens` 计算费用
 *                   - 如果 `pricingType` 为 `call`（按调用次数计价），`estimatedTokens` 不影响费用计算
 *                   
 *                   **示例：**
 *                   - 模型：`gemini-2.5-flash-image`，`maxToken=8192`，用户传入 `estimatedTokens=10000`
 *                   - 实际预估费用按 `maxToken=8192` 计算（而不是10000）
 *     responses:
 *       200:
 *         description: 申请成功
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
 *                         id:
 *                           type: string
 *                           example: "auth_123456"
 *                         callToken:
 *                           type: string
 *                           example: "call_token_abc123xyz"
 *                         apiKey:
 *                           type: string
 *                           nullable: true
 *                           example: "sk-xxxxx"
 *                           description: |
 *                             AI服务提供商的API密钥（按优先级选择）
 *                             - 可能为 `null`：如果所有API Key都不可用（已过期、已禁用、提供商积分不足等）
 *                             - 客户端应该检查该值，如果为 `null`，说明当前无法调用该模型
 *                             
 *                             **选择优先级：**
 *                             1. 用户专属API Key（user_created > system_created）
 *                             2. 提供商关联的API Key（provider_associated类型，userId=null，检查提供商quota）
 *                             
 *                             **注意：**
 *                             - 主账户Token（mainAccountToken）仅用于调用第三方API创建API Key，不会返回给客户端使用
 *                             - 如果提供商不支持API Key自动创建，管理员需要在"供应商API Key管理"页面手动添加提供商关联的API Key
 *                         providerBaseUrl:
 *                           type: string
 *                           example: "https://api.deepseek.com"
 *                         modelBaseUrl:
 *                           type: string
 *                           example: "/v1/chat/completions"
 *                         modelName:
 *                           type: string
 *                           example: "deepseek-chat"
 *                         apiConfig:
 *                           type: string
 *                           nullable: true
 *                           example: '{"temperature": 0.7}'
 *                           description: API配置参数（JSON字符串）
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T12:10:00Z"
 *                         frozenQuota:
 *                           type: number
 *                           example: 0.5
 *                           description: 预冻结的额度（积分）
 *                         estimatedCost:
 *                           type: number
 *                           example: 0.5
 *                           description: 预估费用（积分）
 *                         maxToken:
 *                           type: integer
 *                           nullable: true
 *                           example: 8192
 *                           description: |
 *                             模型的最大Token数（pricingType为token时有效）
 *                             - 如果模型价格配置中设置了maxToken，返回该值
 *                             - 如果模型价格配置中maxToken为null，返回null
 *                             - 如果pricingType为call，返回null
 *                         usedMaxToken:
 *                           type: boolean
 *                           example: true
 *                           description: |
 *                             是否使用了maxToken进行费用预估
 *                             - true：使用了maxToken（即使estimatedTokens更大）
 *                             - false：使用了estimatedTokens或默认值
 *             examples:
 *               example1:
 *                 summary: 成功申请授权（使用用户专属API Key）
 *                 value:
 *                   success: true
 *                   message: "Authorization granted"
 *                   data:
 *                     id: "auth_123456"
 *                     callToken: "call_token_abc123xyz"
 *                     apiKey: "sk-user-created-key-xxxxx"
 *                     providerBaseUrl: "https://api.deepseek.com"
 *                     modelBaseUrl: "/v1/chat/completions"
 *                     modelName: "deepseek-chat"
 *                     apiConfig: '{"temperature": 0.7}'
 *                     expiresAt: "2024-01-01T12:10:00Z"
 *                     frozenQuota: 0.5
 *                     estimatedCost: 0.5
 *                     maxToken: null
 *                     usedMaxToken: false
 *               example2:
 *                 summary: 成功申请授权（使用提供商关联API Key）
 *                 value:
 *                   success: true
 *                   message: "Authorization granted"
 *                   data:
 *                     id: "auth_123457"
 *                     callToken: "call_token_def456uvw"
 *                     apiKey: "sk-provider-associated-key-yyyyy"
 *                     providerBaseUrl: "https://api.deepseek.com"
 *                     modelBaseUrl: "/v1/chat/completions"
 *                     modelName: "deepseek-chat"
 *                     apiConfig: null
 *                     expiresAt: "2024-01-01T12:10:00Z"
 *                     frozenQuota: 1.0
 *                     estimatedCost: 1.0
 *                     maxToken: 8192
 *                     usedMaxToken: true
 *               example3:
 *                 summary: 申请失败（没有可用的API Key）
 *                 value:
 *                   success: false
 *                   message: "No available API Key for this provider"
 *                 description: |
 *                   当所有API Key都不可用时返回此错误，可能原因：
 *                   - 用户专属API Key已过期或已禁用
 *                   - 提供商关联的API Key已过期、已禁用或提供商积分不足
 *                   - 提供商不支持API Key自动创建且管理员未手动添加提供商关联的API Key
 *       400:
 *         description: 请求参数错误或额度不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidParams:
 *                 summary: 参数错误
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors: [
 *                     {
 *                       field: "modelId",
 *                       message: "Model ID is required"
 *                     }
 *                   ]
 *               insufficientQuota:
 *                 summary: 额度不足
 *                 value:
 *                   success: false
 *                   message: "Insufficient quota"
 *               noApiKeyAvailable:
 *                 summary: 没有可用的API Key
 *                 value:
 *                   success: false
 *                   message: "No available API Key for this provider"
 *                 description: |
 *                   所有API Key都不可用，可能原因：
 *                   - 用户专属API Key已过期或已禁用
 *                   - 提供商关联的API Key已过期、已禁用或提供商积分不足
 *                   - 提供商不支持API Key自动创建且管理员未手动添加提供商关联的API Key
 *                   
 *                   **注意：** 主账户Token（mainAccountToken）不会返回给客户端使用，仅用于调用第三方API创建API Key
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 用户状态异常或套餐权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               userStatus:
 *                 summary: 用户状态异常
 *                 value:
 *                   success: false
 *                   message: "User account is not available"
 *               noAccess:
 *                 summary: 套餐权限不足
 *                 value:
 *                   success: false
 *                   message: "This model is not included in your subscription"
 *       404:
 *         description: 模型不存在或服务不可用
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               modelNotFound:
 *                 summary: 模型不存在
 *                 value:
 *                   success: false
 *                   message: "Model not found"
 *               modelInactive:
 *                 summary: 模型不可用
 *                 value:
 *                   success: false
 *                   message: "Model is currently unavailable"
 *               providerInactive:
 *                 summary: 服务提供商不可用
 *                 value:
 *                   success: false
 *                   message: "Service provider is currently unavailable"
 */
router.post(
  '/authorization/request',
  requestAuthorizationValidator,
  validate,
  userApiController.requestAuthorization.bind(userApiController)
);

/**
 * @swagger
 * /api/user/authorization/my-authorizations:
 *   get:
 *     summary: 获取我的授权列表 [仅终端用户]
 *     description: |
 *       查询当前用户的所有授权记录，支持按模型、状态筛选和分页查询。
 *       
 *       **授权状态：**
 *       - active：活跃，可以使用
 *       - used：已使用，已完成调用
 *       - expired：已过期
 *       - revoked：已撤销
 *       
 *       **使用示例：**
 *       ```bash
 *       # 获取所有授权
 *       curl "http://localhost:5800/api/user/authorization/my-authorizations?page=1&pageSize=20" \
 *         -H "Authorization: Bearer {token}"
 *       
 *       # 获取活跃的授权
 *       curl "http://localhost:5800/api/user/authorization/my-authorizations?status=active&activeOnly=true" \
 *         -H "Authorization: Bearer {token}"
 *       
 *       # 按模型筛选
 *       curl "http://localhost:5800/api/user/authorization/my-authorizations?modelId=clx123456789" \
 *         -H "Authorization: Bearer {token}"
 *       ```
 *     tags: [终端用户AI调用]
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
 *         name: modelId
 *         schema:
 *           type: string
 *         description: 模型ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, used, expired, revoked]
 *         description: 授权状态筛选
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否只返回活跃的授权（未过期且状态为active）
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
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "auth_123456"
 *                           userId:
 *                             type: string
 *                             example: "user_123"
 *                           modelId:
 *                             type: string
 *                             example: "model_123"
 *                           model:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               displayName:
 *                                 type: string
 *                               provider:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                   displayName:
 *                                     type: string
 *                           deviceFingerprint:
 *                             type: string
 *                             example: "device_hash_abc123"
 *                           frozenQuota:
 *                             type: number
 *                             example: 0.5
 *                             description: 预冻结的额度（积分）
 *                           callToken:
 *                             type: string
 *                             nullable: true
 *                             example: "call_token_abc123xyz"
 *                           status:
 *                             type: string
 *                             enum: [active, used, expired, revoked]
 *                             example: "active"
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T12:10:00Z"
 *                           requestId:
 *                             type: string
 *                             nullable: true
 *                             example: "req_123456"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T12:00:00Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T12:00:00Z"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
  '/authorization/my-authorizations',
  getMyAuthorizationsValidator,
  validate,
  userApiController.getMyAuthorizations.bind(userApiController)
);

/**
 * @swagger
 * /api/user/authorization/{id}/cancel:
 *   post:
 *     summary: 取消授权 [仅终端用户]
 *     description: |
 *       取消指定的授权，释放预冻结的额度。
 *       
 *       **注意事项：**
 *       - 只能取消自己的授权
 *       - 只能取消状态为active的授权
 *       - 取消后会释放所有预冻结的额度
 *       - 取消操作是立即生效的，无法恢复
 *       
 *       **使用示例：**
 *       ```bash
 *       curl -X POST "http://localhost:5800/api/user/authorization/{id}/cancel" \
 *         -H "Authorization: Bearer {token}"
 *       ```
 *     tags: [终端用户AI调用]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 授权ID
 *     responses:
 *       200:
 *         description: 取消成功
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
 *                         refundedQuota:
 *                           type: number
 *                           example: 0.5
 *                           description: 退回的额度（积分）
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidParams:
 *                 summary: 参数错误
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *               notActive:
 *                 summary: 授权不是活跃状态
 *                 value:
 *                   success: false
 *                   message: "Authorization is not active"
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 无权操作该授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Authorization does not belong to user"
 *       404:
 *         description: 授权不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/authorization/:id/cancel',
  cancelAuthorizationValidator,
  validate,
  userApiController.cancelAuthorization.bind(userApiController)
);

/**
 * @swagger
 * /api/user/ai/call/report:
 *   post:
 *     summary: 上报调用结果 [仅终端用户]
 *     description: |
 *       桌面端在完成AI调用后，需要上报调用结果用于额度结算和日志记录。
 *       
 *       **流程说明：**
 *       1. 验证callToken并获取授权记录
 *       2. 计算实际费用（根据实际token消耗）
 *       3. 结算额度：
 *          - 如果实际费用 < 预冻结额度：退回差额
 *          - 如果实际费用 > 预冻结额度：补充扣减
 *          - 如果调用失败：释放所有预冻结额度
 *       4. 记录调用日志
 *       5. 更新授权状态为used
 *       
 *       **Token说明：**
 *       - 如果pricingType为token，需要提供inputTokens和outputTokens
 *       - 如果pricingType为call，token数量不影响费用计算
 *       - totalTokens = inputTokens + outputTokens（可选，用于记录）
 *       
 *       **状态说明：**
 *       - success：调用成功
 *       - failed：调用失败
 *       - timeout：调用超时
 *       - error：调用错误
 *       
 *       **使用示例：**
 *       ```bash
 *       # 成功调用
 *       curl -X POST http://localhost:5800/api/user/ai/call/report \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "callToken": "call_token_abc123xyz",
 *           "requestId": "req_123456",
 *           "inputTokens": 100,
 *           "outputTokens": 200,
 *           "totalTokens": 300,
 *           "status": "success",
 *           "duration": 1500,
 *           "responseTime": "2024-01-01T12:00:00Z"
 *         }'
 *       
 *       # 失败调用
 *       curl -X POST http://localhost:5800/api/user/ai/call/report \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "callToken": "call_token_abc123xyz",
 *           "requestId": "req_123457",
 *           "status": "failed",
 *           "errorMessage": "API rate limit exceeded"
 *         }'
 *       ```
 *     tags: [终端用户AI调用]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callToken
 *               - requestId
 *               - status
 *             properties:
 *               callToken:
 *                 type: string
 *                 example: "call_token_abc123xyz"
 *                 description: 调用令牌（从申请授权接口获取）
 *               requestId:
 *                 type: string
 *                 example: "req_123456"
 *                 description: 请求ID，用于唯一标识本次调用（不能重复）
 *               inputTokens:
 *                 type: integer
 *                 example: 100
 *                 description: 输入token数量（调用成功时必填）
 *               outputTokens:
 *                 type: integer
 *                 example: 200
 *                 description: 输出token数量（调用成功时必填）
 *               totalTokens:
 *                 type: integer
 *                 example: 300
 *                 description: 总token数量（可选，用于记录）
 *               status:
 *                 type: string
 *                 enum: [success, failed, timeout, error]
 *                 example: "success"
 *                 description: 调用状态
 *               errorMessage:
 *                 type: string
 *                 nullable: true
 *                 example: "API rate limit exceeded"
 *                 description: 错误信息（调用失败时可选）
 *               duration:
 *                 type: integer
 *                 nullable: true
 *                 example: 1500
 *                 description: 调用耗时（毫秒）
 *               responseTime:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2024-01-01T12:00:00Z"
 *                 description: 响应时间（ISO 8601格式）
 *     responses:
 *       200:
 *         description: 上报成功
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
 *                         requestId:
 *                           type: string
 *                           example: "req_123456"
 *                         actualCost:
 *                           type: number
 *                           example: 0.3
 *                           description: 实际费用（积分）
 *                         frozenQuota:
 *                           type: number
 *                           example: 0.5
 *                           description: 预冻结的额度（积分）
 *                         refundedQuota:
 *                           type: number
 *                           example: 0.2
 *                           description: 退回的额度（积分）
 *                         additionalCost:
 *                           type: number
 *                           example: 0
 *                           description: 补充扣减的额度（积分）
 *                         remainingQuota:
 *                           type: number
 *                           example: 9999.7
 *                           description: 剩余可用额度（积分）
 *       400:
 *         description: 请求参数错误、授权已过期或requestId重复
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidParams:
 *                 summary: 参数错误
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors: [
 *                     {
 *                       field: "callToken",
 *                       message: "Call token is required"
 *                     }
 *                   ]
 *               expiredAuth:
 *                 summary: 授权已过期
 *                 value:
 *                   success: false
 *                   message: "Authorization has expired"
 *               duplicateRequest:
 *                 summary: requestId重复
 *                 value:
 *                   success: false
 *                   message: "Request ID already exists"
 *               usedAuth:
 *                 summary: 授权已使用
 *                 value:
 *                   success: false
 *                   message: "Authorization has already been used with requestId: req_123456"
 *               insufficientQuota:
 *                 summary: 额度不足（补充扣减时）
 *                 value:
 *                   success: false
 *                   message: "Insufficient quota for additional cost"
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 *       404:
 *         description: 授权不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Authorization not found"
 */
router.post(
  '/ai/call/report',
  reportCallValidator,
  validate,
  userApiController.reportCall.bind(userApiController)
);

/**
 * @swagger
 * /api/user/ai/logs:
 *   get:
 *     summary: 获取调用日志列表 [仅终端用户]
 *     description: |
 *       查询当前用户的所有AI调用日志，支持按模型、状态、时间范围筛选和分页查询。
 *       
 *       **返回字段说明：**
 *       - **requestTime**：请求时间（客户端发起AI调用请求的时间）
 *       - **model**：调用的AI模型信息（包含模型名称、显示名称、提供商信息）
 *       - **cost**：消耗的额度（积分），本次调用实际扣除的积分
 *       - **status**：任务状态
 *         - `success`：调用成功
 *         - `failure`：调用失败（数据库中实际存储的状态值，包括所有失败情况）
 *       - **inputTokens**：输入Token数量
 *       - **outputTokens**：输出Token数量
 *       - **totalTokens**：总Token数量
 *       - **duration**：调用耗时（毫秒）
 *       - **responseTime**：响应时间（AI服务返回结果的时间）
 *       - **errorMessage**：错误信息（如果调用失败）
 *       - **deviceFingerprint**：设备指纹（用于设备识别）
 *       
 *       **状态值说明：**
 *       - 查询参数 `status` 支持：`success`, `failure`, `failed`, `timeout`, `error`
 *       - 返回数据中的 `status` 字段只包含：`success` 或 `failure`
 *       - 查询时使用 `failed`, `timeout`, `error` 都会查询到 `status=failure` 的记录
 *       
 *       **使用示例：**
 *       ```bash
 *       # 获取所有日志
 *       curl "http://localhost:5800/api/user/ai/logs?page=1&pageSize=20" \
 *         -H "Authorization: Bearer {token}"
 *       
 *       # 按状态筛选（支持 success, failure, failed, timeout, error）
 *       curl "http://localhost:5800/api/user/ai/logs?status=failure" \
 *         -H "Authorization: Bearer {token}"
 *       
 *       # 按时间范围筛选
 *       curl "http://localhost:5800/api/user/ai/logs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
 *         -H "Authorization: Bearer {token}"
 *       
 *       # 组合筛选
 *       curl "http://localhost:5800/api/user/ai/logs?modelId=clx123456789&status=success&page=1&pageSize=10" \
 *         -H "Authorization: Bearer {token}"
 *       ```
 *     tags: [终端用户AI调用]
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
 *         name: modelId
 *         schema:
 *           type: string
 *         description: 模型ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure, failed, timeout, error]
 *         description: |
 *           调用状态筛选
 *           - `success`：调用成功
 *           - `failure`：调用失败（数据库实际存储的状态值）
 *           - `failed`：调用失败（兼容旧版本，会映射为failure）
 *           - `timeout`：调用超时（会映射为failure）
 *           - `error`：调用错误（会映射为failure）
 *           
 *           **注意**：除了 `success` 之外，其他所有状态值（`failure`, `failed`, `timeout`, `error`）在数据库中都会存储为 `failure`。
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期（ISO 8601格式）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期（ISO 8601格式）
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
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "log_123456"
 *                           requestId:
 *                             type: string
 *                             example: "req_123456"
 *                           userId:
 *                             type: string
 *                             example: "user_123"
 *                           modelId:
 *                             type: string
 *                             example: "model_123"
 *                           model:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               displayName:
 *                                 type: string
 *                               provider:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                   displayName:
 *                                     type: string
 *                           inputTokens:
 *                             type: integer
 *                             example: 100
 *                             description: 输入Token数量
 *                           outputTokens:
 *                             type: integer
 *                             example: 200
 *                             description: 输出Token数量
 *                           totalTokens:
 *                             type: integer
 *                             example: 300
 *                             description: 总Token数量（inputTokens + outputTokens）
 *                           cost:
 *                             type: number
 *                             example: 0.3
 *                             description: 本次调用成本（积分）
 *                           status:
 *                             type: string
 *                             enum: [success, failure]
 *                             example: "success"
 *                             description: |
 *                               调用状态
 *                               - `success`：调用成功
 *                               - `failure`：调用失败（数据库中实际存储的状态值）
 *                           errorMessage:
 *                             type: string
 *                             nullable: true
 *                             example: "API rate limit exceeded"
 *                           requestTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T12:00:00Z"
 *                             description: 请求时间（客户端发起AI调用请求的时间）
 *                           responseTime:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             example: "2024-01-01T12:00:01Z"
 *                             description: 响应时间（AI服务返回结果的时间）
 *                           duration:
 *                             type: integer
 *                             nullable: true
 *                             example: 1500
 *                             description: 调用耗时（毫秒），从请求到响应的时间差
 *                           deviceFingerprint:
 *                             type: string
 *                             nullable: true
 *                             example: "device_hash_abc123"
 *                             description: 设备指纹（用于设备识别和管理）
 *                           ipAddress:
 *                             type: string
 *                             nullable: true
 *                             example: "192.168.1.1"
 *                             description: 请求IP地址
 *             examples:
 *               example1:
 *                 summary: 成功调用日志
 *                 value:
 *                   success: true
 *                   message: "Success"
 *                   data:
 *                     - id: "log_123456"
 *                       requestId: "req_123456"
 *                       userId: "user_123"
 *                       modelId: "model_123"
 *                       model:
 *                         id: "model_123"
 *                         name: "deepseek-chat"
 *                         displayName: "DeepSeek Chat"
 *                         provider:
 *                           id: "provider_123"
 *                           name: "DeepSeek"
 *                           displayName: "DeepSeek AI"
 *                       inputTokens: 100
 *                       outputTokens: 200
 *                       totalTokens: 300
 *                       cost: 0.3
 *                       status: "success"
 *                       errorMessage: null
 *                       requestTime: "2024-01-01T12:00:00Z"
 *                       responseTime: "2024-01-01T12:00:01Z"
 *                       duration: 1500
 *                       deviceFingerprint: "device_hash_abc123"
 *                       ipAddress: "192.168.1.1"
 *               example2:
 *                 summary: 失败调用日志
 *                 value:
 *                   success: true
 *                   message: "Success"
 *                   data:
 *                     - id: "log_123457"
 *                       requestId: "req_123457"
 *                       userId: "user_123"
 *                       modelId: "model_123"
 *                       model:
 *                         id: "model_123"
 *                         name: "deepseek-chat"
 *                         displayName: "DeepSeek Chat"
 *                         provider:
 *                           id: "provider_123"
 *                           name: "DeepSeek"
 *                           displayName: "DeepSeek AI"
 *                       inputTokens: 0
 *                       outputTokens: 0
 *                       totalTokens: 0
 *                       cost: 0
 *                       status: "failure"
 *                       errorMessage: "API rate limit exceeded"
 *                       requestTime: "2024-01-01T12:00:00Z"
 *                       responseTime: null
 *                       duration: 500
 *                       deviceFingerprint: "device_hash_abc123"
 *                       ipAddress: "192.168.1.1"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
  '/ai/logs',
  getCallLogsValidator,
  validate,
  userApiController.getCallLogs.bind(userApiController)
);

/**
 * @swagger
 * /api/user/ai/logs/{requestId}:
 *   get:
 *     summary: 获取调用日志详情 [仅终端用户]
 *     description: |
 *       根据requestId获取调用日志的详细信息，包括完整的调用参数、响应信息等。
 *       
 *       **注意事项：**
 *       - 只能查看自己的调用日志
 *       - requestId必须唯一，由客户端生成
 *       
 *       **使用示例：**
 *       ```bash
 *       curl "http://localhost:5800/api/user/ai/logs/req_123456" \
 *         -H "Authorization: Bearer {token}"
 *       ```
 *     tags: [终端用户AI调用]
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
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "log_123456"
 *                         requestId:
 *                           type: string
 *                           example: "req_123456"
 *                         userId:
 *                           type: string
 *                           example: "user_123"
 *                         modelId:
 *                           type: string
 *                           example: "model_123"
 *                           description: 模型ID
 *                         model:
 *                           type: object
 *                           description: 调用的AI模型信息
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "model_123"
 *                             name:
 *                               type: string
 *                               example: "deepseek-chat"
 *                               description: 模型名称（内部标识）
 *                             displayName:
 *                               type: string
 *                               example: "DeepSeek Chat"
 *                               description: 模型显示名称
 *                             provider:
 *                               type: object
 *                               description: 模型提供商信息
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   example: "provider_123"
 *                                 name:
 *                                   type: string
 *                                   example: "DeepSeek"
 *                                   description: 提供商名称（内部标识）
 *                                 displayName:
 *                                   type: string
 *                                   example: "DeepSeek AI"
 *                                   description: 提供商显示名称
 *                         inputTokens:
 *                           type: integer
 *                           example: 100
 *                           description: 输入Token数量
 *                         outputTokens:
 *                           type: integer
 *                           example: 200
 *                           description: 输出Token数量
 *                         totalTokens:
 *                           type: integer
 *                           example: 300
 *                           description: 总Token数量（inputTokens + outputTokens）
 *                         cost:
 *                           type: number
 *                           example: 0.3
 *                           description: |
 *                             本次调用消耗的额度（积分）
 *                             - 调用成功时：根据实际Token消耗计算的实际费用
 *                             - 调用失败时：通常为0（预冻结的额度会被退回）
 *                         status:
 *                           type: string
 *                           enum: [success, failure]
 *                           example: "success"
 *                           description: |
 *                             任务状态
 *                             - `success`：调用成功
 *                             - `failure`：调用失败（可能原因：API错误、超时、额度不足等）
 *                         errorMessage:
 *                           type: string
 *                           nullable: true
 *                           example: "API rate limit exceeded"
 *                           description: 错误信息（调用失败时的错误详情）
 *                         requestTime:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T12:00:00Z"
 *                           description: 请求时间（客户端发起AI调用请求的时间）
 *                         responseTime:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: "2024-01-01T12:00:01Z"
 *                           description: 响应时间（AI服务返回结果的时间，调用失败时可能为null）
 *                         duration:
 *                           type: integer
 *                           nullable: true
 *                           example: 1500
 *                           description: 调用耗时（毫秒），从请求到响应的时间差
 *                         deviceFingerprint:
 *                           type: string
 *                           nullable: true
 *                           example: "device_hash_abc123"
 *                           description: 设备指纹（用于设备识别和管理）
 *                         ipAddress:
 *                           type: string
 *                           nullable: true
 *                           example: "192.168.1.1"
 *                           description: 请求IP地址
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
 *         description: 无权访问该日志
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Call log does not belong to user"
 *       404:
 *         description: 日志不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/ai/logs/:requestId',
  getCallLogDetailValidator,
  validate,
  userApiController.getCallLogDetail.bind(userApiController)
);

module.exports = router;
