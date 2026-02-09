const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const providerApiKeyController = require('../controllers/providerApiKey.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getProvidersValidator,
    createProviderValidator,
    updateProviderValidator,
    getProviderDetailValidator,
    updateProviderStatusValidator
} = require('../validators/provider.validator');
const { addProviderApiKeyValidator } = require('../validators/userApiKey.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/providers:
 *   get:
 *     summary: 获取提供商列表 [管理员/终端用户]
 *     description: |
 *       获取AI模型提供商列表，支持多条件筛选、分页和排序。
 *
 *       **权限说明**：
 *       - **管理员角色**：super_admin、platform_admin、read_only 可访问（可查看所有提供商）
 *       - **终端用户角色**：user、basic_user 可访问（仅查看，不能进行增删改操作）
 *
 *       **筛选说明**：
 *       - 所有筛选参数都是可选的，可以组合使用
 *       - 支持模糊搜索的字段：name、displayName
 *       - 支持精确匹配的字段：isActive
 *       - **如果不传 isActive 参数，将返回所有状态的提供商**（启用和禁用）
 *
 *       **分页说明**：
 *       - page：页码，从1开始，默认1
 *       - pageSize：每页数量，默认20，建议不超过100
 *
 *       **排序说明**：
 *       - 默认按创建时间降序排列（最新的在前）
 *
 *       **使用示例**：
 *       - 获取所有提供商：`GET /api/providers`
 *       - 仅获取启用的提供商：`GET /api/providers?isActive=true`
 *       - 搜索提供商：`GET /api/providers?name=DeepSeek`
 *       - 组合筛选：`GET /api/providers?isActive=true&page=1&pageSize=20`
 *     tags: [提供商管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: 每页数量（建议不超过100）
 *         example: 20
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 提供商标识（模糊搜索，如：DeepSeek、OpenAI）
 *         example: "DeepSeek"
 *       - in: query
 *         name: displayName
 *         schema:
 *           type: string
 *         description: 提供商显示名称（模糊搜索）
 *         example: "DeepSeek AI"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用（true=仅启用，false=仅禁用，不传=全部）
 *         example: true
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建开始时间（ISO 8601格式，用于时间范围筛选）
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建结束时间（ISO 8601格式，用于时间范围筛选）
 *         example: "2024-12-31T23:59:59Z"
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
 *                   example: "Success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 提供商ID
 *                         example: "clx123456789"
 *                       name:
 *                         type: string
 *                         description: 提供商标识（唯一）
 *                         example: "DeepSeek"
 *                       displayName:
 *                         type: string
 *                         description: 显示名称
 *                         example: "DeepSeek AI"
 *                       baseUrl:
 *                         type: string
 *                         nullable: true
 *                         description: API服务基地址
 *                         example: "https://api.deepseek.com"
 *                       website:
 *                         type: string
 *                         nullable: true
 *                         description: 官网链接
 *                         example: "https://www.deepseek.com"
 *                       logoUrl:
 *                         type: string
 *                         nullable: true
 *                         description: Logo链接
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: 描述信息
 *                       quota:
 *                         type: number
 *                         format: decimal
 *                         nullable: true
 *                         description: 额度（积分）
 *                         example: 10000.00
 *                       quotaUnit:
 *                         type: string
 *                         nullable: true
 *                         description: 额度单位（目前仅支持points=积分）
 *                         example: "points"
 *                       mainAccountToken:
 *                         type: string
 *                         nullable: true
 *                         description: 主账户token（敏感信息，通常不返回）
 *                       isActive:
 *                         type: boolean
 *                         description: 是否启用
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 更新时间
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: 未认证或token无效
 */
// 获取提供商列表（管理员和终端用户都可以访问）
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY, ROLES.USER, ROLES.BASIC_USER),
    getProvidersValidator,
    validate,
    providerController.getProviders.bind(providerController)
);

/**
 * @swagger
 * /api/providers/{id}:
 *   get:
 *     summary: 获取提供商详情 [管理员/终端用户]
 *     description: |
 *       获取指定提供商的详细信息，包括模型列表、额度信息等。
 *
 *       **权限说明**：
 *       - **管理员角色**：super_admin、platform_admin、read_only 可访问
 *       - **终端用户角色**：user、basic_user 可访问（仅查看）
 *     tags: [提供商管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *         example: "clx123456789"
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
 *                   example: "Provider detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 提供商ID
 *                     name:
 *                       type: string
 *                       description: 提供商标识（唯一）
 *                     displayName:
 *                       type: string
 *                       description: 显示名称
 *                     baseUrl:
 *                       type: string
 *                       nullable: true
 *                       description: API服务基地址
 *                     website:
 *                       type: string
 *                       nullable: true
 *                       description: 官网链接
 *                     logoUrl:
 *                       type: string
 *                       nullable: true
 *                       description: Logo链接
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: 描述信息
 *                     quota:
 *                       type: number
 *                       format: decimal
 *                       nullable: true
 *                       description: 额度（积分）
 *                     quotaUnit:
 *                       type: string
 *                       nullable: true
 *                       description: 额度单位
 *                     isActive:
 *                       type: boolean
 *                       description: 是否启用
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 提供商不存在
 */
// 获取提供商详情（管理员和终端用户都可以访问）
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY, ROLES.USER, ROLES.BASIC_USER),
    getProviderDetailValidator,
    validate,
    providerController.getProviderDetail.bind(providerController)
);

/**
 * @swagger
 * /api/providers:
 *   post:
 *     summary: 创建提供商（仅超级管理员）
 *     tags: [提供商管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *               - baseUrl
 *             properties:
 *               name:
 *                 type: string
 *                 example: DeepSeek
 *                 description: 提供商标识（唯一）
 *               displayName:
 *                 type: string
 *                 example: DeepSeek AI
 *                 description: 显示名称
 *               baseUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://api.deepseek.com
 *                 description: API 服务基地址
 *               website:
 *                 type: string
 *                 format: uri
 *                 example: https://www.deepseek.com
 *                 description: 官网链接
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *                 description: Logo 链接
 *               description:
 *                 type: string
 *                 description: 描述信息
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: 是否启用
 *               quota:
 *                 type: number
 *                 format: float
 *                 example: 10000.00
 *                 description: 额度
 *               quotaUnit:
 *                 type: string
 *                 enum: [points]
 *                 default: points
 *                 example: points
 *                 description: 额度单位（仅支持points=积分）
 *               mainAccountToken:
 *                 type: string
 *                 example: sk-xxxxx
 *                 description: 主账户token
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 创建提供商（仅超级管理员）
router.post(
    '/',
    authorize(ROLES.SUPER_ADMIN),
    createProviderValidator,
    validate,
    providerController.createProvider.bind(providerController)
);

/**
 * @swagger
 * /api/providers/{id}:
 *   put:
 *     summary: 更新提供商（仅超级管理员）
 *     tags: [提供商管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: DeepSeek AI
 *                 description: 显示名称
 *               baseUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://api.deepseek.com
 *                 description: API 服务基地址
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: 官网链接
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *                 description: Logo 链接
 *               description:
 *                 type: string
 *                 description: 描述信息
 *               isActive:
 *                 type: boolean
 *                 description: 是否启用
 *               quota:
 *                 type: number
 *                 format: float
 *                 example: 10000.00
 *                 description: 额度
 *               quotaUnit:
 *                 type: string
 *                 enum: [points]
 *                 default: points
 *                 example: points
 *                 description: 额度单位（仅支持points=积分）
 *               mainAccountToken:
 *                 type: string
 *                 example: sk-xxxxx
 *                 description: 主账户token
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 提供商不存在
 */
// 更新提供商（仅超级管理员）
router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN),
    updateProviderValidator,
    validate,
    providerController.updateProvider.bind(providerController)
);

/**
 * @swagger
 * /api/providers/{id}/status:
 *   patch:
 *     summary: 更新提供商状态（仅超级管理员）
 *     tags: [提供商管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: 是否启用（禁用后，该提供商下的所有模型自动禁用）
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 提供商不存在
 */
// 更新提供商状态（仅超级管理员）
router.patch(
    '/:id/status',
    authorize(ROLES.SUPER_ADMIN),
    updateProviderStatusValidator,
    validate,
    providerController.updateProviderStatus.bind(providerController)
);

/**
 * @swagger
 * /api/providers/{id}:
 *   delete:
 *     summary: 删除提供商（仅超级管理员）
 *     tags: [提供商管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 该提供商下存在模型，请先删除或转移
 *       404:
 *         description: 提供商不存在
 */
// 删除提供商（仅超级管理员）
router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN),
    getProviderDetailValidator,
    validate,
    providerController.deleteProvider.bind(providerController)
);

/**
 * @swagger
 * /api/providers/{id}/api-keys:
 *   get:
 *     summary: 获取提供商的API Key列表 [管理员]
 *     description: |
 *       获取指定提供商的所有API Key列表，支持筛选。
 *
 *       **注意：**
 *       - 当前版本返回所有匹配的API Key，暂不支持分页
 *       - `page` 和 `pageSize` 参数已预留，但当前不会生效
 *       - 如果API Key数量较多，建议使用 `userId` 或 `status` 参数进行筛选
 *
 *       **API Key类型说明：**
 *       - **系统级API Key**：`userId` 为 `null`，关联到提供商，供所有用户使用
 *         - `type = 'provider_associated'`：管理员手动添加的提供商关联API Key
 *         - `type = 'system_created'`：系统自动创建（用户绑定套餐时）
 *       - **用户专属API Key**：`userId` 有值，属于特定用户
 *         - `type = 'user_created'`：用户自己创建
 *         - `type = 'system_created'`：系统为用户自动创建
 *
 *       **筛选说明：**
 *       - 不传 `userId`：返回该提供商的所有API Key（包括系统级和用户级）
 *       - `userId=null`：只返回系统级API Key（`userId` 为 `null`）
 *       - `userId=具体用户ID`：只返回该用户的API Key
 *       - `status`：按状态筛选（active/expired/revoked）
 *
 *       **返回数据说明：**
 *       - API Key字段已解密（`apiKey` 字段返回解密后的值）
 *       - `expireTime` 为0表示永不过期
 *       - `credits` 为0表示无限制（使用用户内部额度或提供商主账户额度）
 *       - 包含关联的用户信息（如果 `userId` 不为null）
 *
 *       **使用示例：**
 *       ```bash
 *       # 获取所有API Key
 *       curl -X GET "http://localhost:5800/api/providers/{id}/api-keys" \
 *         -H "Authorization: Bearer {token}"
 *
 *       # 只获取系统级API Key
 *       curl -X GET "http://localhost:5800/api/providers/{id}/api-keys?userId=null" \
 *         -H "Authorization: Bearer {token}"
 *
 *       # 获取特定用户的API Key
 *       curl -X GET "http://localhost:5800/api/providers/{id}/api-keys?userId=cml7efj6f0001guqcwcty7k6u" \
 *         -H "Authorization: Bearer {token}"
 *
 *       # 获取活跃状态的API Key
 *       curl -X GET "http://localhost:5800/api/providers/{id}/api-keys?status=active" \
 *         -H "Authorization: Bearer {token}"
 *
 *       # 组合筛选：获取系统级且活跃的API Key
 *       curl -X GET "http://localhost:5800/api/providers/{id}/api-keys?userId=null&status=active" \
 *         -H "Authorization: Bearer {token}"
 *       ```
 *     tags: [提供商API Key管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *         example: "cmkurq76s000013wwssui4g6m"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           nullable: true
 *         description: |
 *           用户ID（可选）
 *           - 不传：返回所有API Key
 *           - `null`：只返回系统级API Key（userId为null）
 *           - 具体用户ID：只返回该用户的API Key
 *         example: null
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, revoked]
 *         description: 状态筛选（可选）
 *         example: active
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码（从1开始，当前版本暂未实现分页，返回所有结果）
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量（当前版本暂未实现分页，返回所有结果）
 *         example: 20
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
 *                             example: "api_key_123456"
 *                           userId:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                             description: 用户ID（null表示系统级API Key）
 *                           providerId:
 *                             type: string
 *                             example: "cmkurq76s000013wwssui4g6m"
 *                           name:
 *                             type: string
 *                             example: "系统API Key_001"
 *                           type:
 *                             type: string
 *                             enum: [system_created, user_created, provider_associated]
 *                             example: "provider_associated"
 *                             description: |
 *                               API Key类型：
 *                               - `system_created`：系统自动创建（用户绑定套餐时）
 *                               - `user_created`：用户自己创建
 *                               - `provider_associated`：管理员手动添加的提供商关联API Key
 *                           credits:
 *                             type: number
 *                             example: 10000
 *                             description: |
 *                               积分额度
 *                               - `0`：表示无限制（使用用户内部额度或提供商主账户额度）
 *                               - 大于0：表示该API Key在第三方平台的额度限制
 *                               - 对于用户创建的API Key，credits通常为0，使用内部额度系统
 *                               - 对于提供商关联的API Key，credits表示第三方平台的额度
 *                           expireTime:
 *                             type: integer
 *                             format: int64
 *                             example: 1735689600
 *                             description: |
 *                               到期时间（Unix时间戳，秒级）
 *                               - `0`：表示永不过期
 *                               - 大于0：表示具体的过期时间戳
 *                               - 如果已过期，status会自动变为'expired'
 *                           status:
 *                             type: string
 *                             enum: [active, expired, revoked]
 *                             example: "active"
 *                           packageId:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00Z"
 *                           user:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "cml7efj6f0001guqcwcty7k6u"
 *                               email:
 *                                 type: string
 *                                 example: "user@example.com"
 *                               phone:
 *                                 type: string
 *                                 example: "13800138000"
 *                           apiKey:
 *                             type: string
 *                             description: API Key值（已解密）
 *                             example: "sk-xxxxxxxxxxxxxx"
 *             examples:
 *               example1:
 *                 summary: 获取所有API Key
 *                 value:
 *                   success: true
 *                   message: "Provider API Keys retrieved successfully"
 *                   data:
 *                     - id: "api_key_123456"
 *                       userId: null
 *                       providerId: "cmkurq76s000013wwssui4g6m"
 *                       name: "系统API Key_001"
 *                       type: "provider_associated"
 *                       credits: 10000
 *                       expireTime: 1735689600
 *                       status: "active"
 *                       packageId: null
 *                       createdAt: "2024-01-01T00:00:00Z"
 *                       updatedAt: "2024-01-01T00:00:00Z"
 *                       apiKey: "sk-xxxxxxxxxxxxxx"
 *                     - id: "api_key_789012"
 *                       userId: "cml7efj6f0001guqcwcty7k6u"
 *                       providerId: "cmkurq76s000013wwssui4g6m"
 *                       name: "用户API Key_001"
 *                       type: "user_created"
 *                       credits: 0
 *                       expireTime: 0
 *                       status: "active"
 *                       packageId: null
 *                       createdAt: "2024-01-02T00:00:00Z"
 *                       updatedAt: "2024-01-02T00:00:00Z"
 *                       apiKey: "sk-yyyyyyyyyyyyyy"
 *                       user:
 *                         id: "cml7efj6f0001guqcwcty7k6u"
 *                         email: "user@example.com"
 *                         phone: "13800138000"
 *               example2:
 *                 summary: 只获取系统级API Key
 *                 value:
 *                   success: true
 *                   message: "Provider API Keys retrieved successfully"
 *                   data:
 *                     - id: "api_key_123456"
 *                       userId: null
 *                       providerId: "cmkurq76s000013wwssui4g6m"
 *                       name: "系统API Key_001"
 *                       type: "provider_associated"
 *                       credits: 10000
 *                       expireTime: 1735689600
 *                       status: "active"
 *                       packageId: null
 *                       createdAt: "2024-01-01T00:00:00Z"
 *                       updatedAt: "2024-01-01T00:00:00Z"
 *                       apiKey: "sk-xxxxxxxxxxxxxx"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               errors:
 *                 - field: "id"
 *                   message: "Invalid provider ID"
 *       404:
 *         description: 提供商不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Provider not found"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Internal server error"
 */
router.get(
    '/:id/api-keys',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getProviderDetailValidator,
    validate,
    providerApiKeyController.getProviderApiKeys.bind(providerApiKeyController)
);

/**
 * @swagger
 * /api/providers/{id}/api-keys:
 *   post:
 *     summary: 为提供商添加关联API Key [管理员]
 *     description: |
 *       为指定提供商添加系统级API Key。添加成功后，该API Key会被关联到提供商，供所有用户使用。
 *
 *       **重要说明：**
 *       - 添加的API Key为系统级（`userId=null`），不属于特定用户
 *       - API Key类型为 `provider_associated`（提供商关联）
 *       - 添加成功后，提供商的总额度（`quota`）会自动增加该API Key的 `credits` 额度
 *       - API Key会被加密存储到数据库（使用AES-256-GCM加密）
 *       - 该API Key会被添加到提供商的 `apiKeys` JSON数组中
 *
 *       **额度管理：**
 *       - 如果设置了 `credits > 0`，该额度会累加到提供商的总额度（`quota`）中
 *       - 如果 `credits = 0`（无限制），不会影响提供商总额度
 *       - 删除API Key时，如果API Key有 `credits > 0`，对应的额度会从提供商总额度中扣除
 *       - 额度扣除时，如果总额度小于0，会被设置为0
 *
 *       **API Key选择优先级（在授权请求时）：**
 *       1. 用户专属API Key（`user_created` 或 `system_created`，credits=0，使用用户内部额度）
 *       2. 提供商关联的API Key（`provider_associated`，credits>0时检查提供商quota>0）
 *       3. 提供商主账户Token（检查提供商quota>0）
 *
 *       **使用场景：**
 *       - 提供商不支持通过接口创建API Key时，手动添加API Key
 *       - 为提供商添加备用API Key，提高可用性
 *       - 为提供商添加有额度限制的API Key，用于特定场景
 *
 *       **使用示例：**
 *       ```bash
 *       # 添加无限制API Key
 *       curl -X POST "http://localhost:5800/api/providers/{id}/api-keys" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "apiKey": "sk-xxxxxxxxxxxxxx",
 *           "name": "系统API Key_001"
 *         }'
 *
 *       # 添加有限额API Key（ISO格式过期时间）
 *       curl -X POST "http://localhost:5800/api/providers/{id}/api-keys" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "apiKey": "sk-yyyyyyyyyyyyyy",
 *           "name": "系统API Key_002",
 *           "apiKeyId": "api_key_123",
 *           "credits": 10000,
 *           "expireTime": "2024-12-31T23:59:59Z"
 *         }'
 *
 *       # 添加有限额API Key（时间戳格式过期时间）
 *       curl -X POST "http://localhost:5800/api/providers/{id}/api-keys" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "apiKey": "sk-zzzzzzzzzzzzzz",
 *           "name": "系统API Key_003",
 *           "apiKeyId": "api_key_456",
 *           "credits": 50000,
 *           "expireTime": 1735689600
 *         }'
 *       ```
 *     tags: [提供商API Key管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *         example: "cmkurq76s000013wwssui4g6m"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *               - name
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: API Key（会被加密存储）
 *                 example: "sk-xxxxxxxxxxxxxx"
 *               name:
 *                 type: string
 *                 description: API Key名称
 *                 example: "系统API Key_001"
 *                 minLength: 1
 *                 maxLength: 255
 *               apiKeyId:
 *                 type: string
 *                 description: 第三方返回的ID（可选，用于追踪）
 *                 example: "xxx"
 *               credits:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 default: 0
 *                 description: |
 *                   积分额度（可选，默认0）
 *                   - 0：表示无限制
 *                   - 大于0：表示该API Key的额度限制
 *                   - 添加成功后，该额度会累加到提供商的总额度中
 *                 example: 10000
 *               expireTime:
 *                 oneOf:
 *                   - type: string
 *                     format: date-time
 *                     description: ISO格式日期时间字符串
 *                     example: "2024-12-31T23:59:59Z"
 *                   - type: integer
 *                     format: int64
 *                     description: Unix时间戳（秒级）
 *                     example: 1735689600
 *                 description: |
 *                   过期时间（可选）
 *                   - ISO格式：如 "2024-12-31T23:59:59Z"
 *                   - 时间戳：如 1735689600（10位秒级时间戳）
 *                   - 不传、null、0或"0"：表示永不过期
 *                 nullable: true
 *           examples:
 *             example1:
 *               summary: 添加无限制API Key
 *               value:
 *                 apiKey: "sk-xxxxxxxxxxxxxx"
 *                 name: "系统API Key_001"
 *                 credits: 0
 *             example2:
 *               summary: 添加有限额API Key（ISO格式）
 *               value:
 *                 apiKey: "sk-yyyyyyyyyyyyyy"
 *                 name: "系统API Key_002"
 *                 apiKeyId: "api_key_123"
 *                 credits: 10000
 *                 expireTime: "2024-12-31T23:59:59Z"
 *             example3:
 *               summary: 添加有限额API Key（时间戳格式）
 *               value:
 *                 apiKey: "sk-zzzzzzzzzzzzzz"
 *                 name: "系统API Key_003"
 *                 apiKeyId: "api_key_456"
 *                 credits: 50000
 *                 expireTime: 1735689600
 *     responses:
 *       201:
 *         description: 添加成功
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
 *                           example: "api_key_123456"
 *                         userId:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                           description: 用户ID（null表示系统级API Key）
 *                         providerId:
 *                           type: string
 *                           example: "cmkurq76s000013wwssui4g6m"
 *                         name:
 *                           type: string
 *                           example: "系统API Key_001"
 *                         type:
 *                           type: string
 *                           enum: [system_created, user_created, provider_associated]
 *                           example: "provider_associated"
 *                           description: |
 *                             API Key类型：
 *                             - `system_created`：系统自动创建
 *                             - `user_created`：用户创建
 *                             - `provider_associated`：管理员手动添加的提供商关联API Key
 *                         credits:
 *                           type: number
 *                           example: 10000
 *                         expireTime:
 *                           type: integer
 *                           format: int64
 *                           example: 1735689600
 *                         status:
 *                           type: string
 *                           example: "active"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
 *                         apiKeyId:
 *                           type: string
 *                           nullable: true
 *                           example: "api_key_123"
 *                           description: 第三方返回的API Key ID（可选）
 *             examples:
 *               example1:
 *                 summary: 添加成功
 *                 value:
 *                   success: true
 *                   message: "Provider API Key created successfully"
 *                   data:
 *                     id: "api_key_123456"
 *                     userId: null
 *                     providerId: "cmkurq76s000013wwssui4g6m"
 *                     name: "系统API Key_001"
 *                     type: "provider_associated"
 *                     credits: 10000
 *                     expireTime: 1735689600
 *                     status: "active"
 *                     apiKeyId: "api_key_123"
 *                     createdAt: "2024-01-01T00:00:00Z"
 *                     updatedAt: "2024-01-01T00:00:00Z"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidParams:
 *                 summary: 参数验证失败
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors: [
 *                     {
 *                       field: "apiKey",
 *                       message: "API Key is required"
 *                     }
 *                   ]
 *             examples:
 *               validationError:
 *                 summary: 验证失败
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors:
 *                     - field: "apiKey"
 *                       message: "API Key is required"
 *                     - field: "name"
 *                       message: "Name must be a string"
 *               invalidExpireTime:
 *                 summary: 过期时间格式错误
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors:
 *                     - field: "expireTime"
 *                       message: "Expire time must be a valid timestamp or ISO date string"
 *       404:
 *         description: 提供商不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Provider not found"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               encryptionError:
 *                 summary: API Key加密失败
 *                 value:
 *                   success: false
 *                   message: "Failed to encrypt API Key"
 *               quotaUpdateError:
 *                 summary: 额度更新失败
 *                 value:
 *                   success: false
 *                   message: "Failed to update provider quota"
 */
router.post(
    '/:id/api-keys',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    getProviderDetailValidator,
    addProviderApiKeyValidator,
    validate,
    providerApiKeyController.addProviderApiKey.bind(providerApiKeyController)
);

/**
 * @swagger
 * /api/providers/{id}/api-keys/{apiKeyId}:
 *   delete:
 *     summary: 删除提供商的关联API Key [管理员]
 *     description: |
 *       删除指定提供商的系统级API Key。
 *
 *       **重要说明：**
 *       - 只能删除系统级API Key（`userId=null`），不能删除用户专属API Key
 *       - 删除成功后，该API Key的 `credits` 额度会从提供商的总额度（`quota`）中扣除
 *       - 该API Key会从提供商的 `apiKeys` JSON数组中移除
 *       - API Key记录会被标记为 `status='revoked'`（已撤销）
 *       - 删除操作不可恢复，请谨慎操作
 *
 *       **额度处理：**
 *       - 如果API Key有 `credits > 0`，删除时会从提供商总额度（`quota`）中扣除
 *       - 如果 `credits = 0`，不会影响提供商总额度
 *       - 如果扣除后总额度小于0，会被设置为0
 *       - 所有操作都在事务中完成，确保数据一致性
 *
 *       **使用示例：**
 *       ```bash
 *       # 删除API Key
 *       curl -X DELETE "http://localhost:5800/api/providers/{id}/api-keys/{apiKeyId}" \
 *         -H "Authorization: Bearer {token}"
 *
 *       # 示例：删除ID为 api_key_123456 的API Key
 *       curl -X DELETE "http://localhost:5800/api/providers/cmkurq76s000013wwssui4g6m/api-keys/api_key_123456" \
 *         -H "Authorization: Bearer {token}"
 *       ```
 *     tags: [提供商API Key管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提供商ID
 *         example: "cmkurq76s000013wwssui4g6m"
 *       - in: path
 *         name: apiKeyId
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *         example: "api_key_123456"
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *                     message:
 *                       type: string
 *                       example: "Provider API Key deleted successfully"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               cannotDeleteUserKey:
 *                 summary: 不能删除用户专属API Key
 *                 value:
 *                   success: false
 *                   message: "Cannot delete user-owned API Key"
 *       404:
 *         description: 提供商或API Key不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               providerNotFound:
 *                 summary: 提供商不存在
 *                 value:
 *                   success: false
 *                   message: "Provider not found"
 *               apiKeyNotFound:
 *                 summary: API Key不存在
 *                 value:
 *                   success: false
 *                   message: "API Key not found"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               quotaUpdateError:
 *                 summary: 额度更新失败
 *                 value:
 *                   success: false
 *                   message: "Failed to update provider quota"
 *               databaseError:
 *                 summary: 数据库操作失败
 *                 value:
 *                   success: false
 *                   message: "Database operation failed"
 */
router.delete(
    '/:id/api-keys/:apiKeyId',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    getProviderDetailValidator,
    validate,
    providerApiKeyController.deleteProviderApiKey.bind(providerApiKeyController)
);

module.exports = router;