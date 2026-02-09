const express = require('express');
const router = express.Router();
const modelController = require('../controllers/model.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getModelsValidator,
    createModelValidator,
    updateModelValidator,
    batchUpdateStatusValidator,
    batchDeleteValidator,
    getModelPricesValidator,
    createModelPriceValidator,
    updateModelPriceValidator
} = require('../validators/model.validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: 获取模型列表 [管理员/终端用户]
 *     description: |
 *       获取AI模型列表，支持多条件筛选、分页和排序。
 *       
 *       **权限说明**：
 *       - **管理员角色**：super_admin、platform_admin、read_only 可访问（可查看所有模型）
 *       - **终端用户角色**：user、basic_user 可访问（仅查看，不能进行增删改操作）
 *       
 *       **筛选说明**：
 *       - 所有筛选参数都是可选的，可以组合使用
 *       - **如果不传 type 参数，将返回所有类型的模型**（llm、video、image、tts）
 *       - 支持模糊搜索的字段：name、displayName、baseUrl
 *       - 支持精确匹配的字段：type、category、providerId、isActive、requiresKey
 *       
 *       **分页说明**：
 *       - page：页码，从1开始，默认1
 *       - pageSize：每页数量，默认20，建议不超过100
 *       
 *       **排序说明**：
 *       - 默认按创建时间降序排列（最新的在前）
 *       
 *       **使用示例**：
 *       - 获取所有模型：`GET /api/models`
 *       - 仅获取 llm 类型：`GET /api/models?type=llm`
 *       - 搜索模型：`GET /api/models?name=deepseek`
 *       - 组合筛选：`GET /api/models?type=llm&isActive=true&page=1&pageSize=20`
 *     tags: [模型管理]
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
 *         description: 模型内部标识（模糊搜索，如：deepseek-chat）
 *         example: "deepseek"
 *       - in: query
 *         name: displayName
 *         schema:
 *           type: string
 *         description: 模型显示名称（模糊搜索）
 *         example: "DeepSeek"
 *       - in: query
 *         name: baseUrl
 *         schema:
 *           type: string
 *         description: 接口路径（模糊搜索，如：/v1/chat/completions）
 *         example: "/v1/chat"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [llm, video, image, tts]
 *         description: |
 *           模型类型筛选（可选）
 *           - llm：大语言模型
 *           - video：视频生成模型
 *           - image：图像生成模型
 *           - tts：文本转语音模型
 *           如果不传此参数，将返回所有类型的模型
 *         example: "llm"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 模型分类（精确匹配，如：chat、completion、generation）
 *         example: "chat"
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: 提供商ID（精确匹配）
 *         example: "clx123456789"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用（true=仅启用，false=仅禁用，不传=全部）
 *         example: true
 *       - in: query
 *         name: requiresKey
 *         schema:
 *           type: boolean
 *         description: 是否需要API密钥（true=需要，false=不需要，不传=全部）
 *         example: false
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
 *                         description: 模型ID
 *                         example: "clx123456789"
 *                       name:
 *                         type: string
 *                         description: 模型内部标识
 *                         example: "deepseek-chat"
 *                       displayName:
 *                         type: string
 *                         description: 模型显示名称
 *                         example: "DeepSeek Chat"
 *                       type:
 *                         type: string
 *                         enum: [llm, video, image, tts]
 *                         description: 模型类型
 *                         example: "llm"
 *                       category:
 *                         type: string
 *                         nullable: true
 *                         description: 模型分类
 *                         example: "chat"
 *                       providerId:
 *                         type: string
 *                         description: 提供商ID
 *                       provider:
 *                         type: object
 *                         description: 提供商信息
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                       baseUrl:
 *                         type: string
 *                         description: 接口路径
 *                         example: "/v1/chat/completions"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: 描述信息
 *                       isActive:
 *                         type: boolean
 *                         description: 是否启用
 *                         example: true
 *                       requiresKey:
 *                         type: boolean
 *                         description: 是否需要API密钥
 *                         example: false
 *                       apiConfig:
 *                         type: string
 *                         nullable: true
 *                         description: API配置参数（JSON字符串）
 *                         example: '{"temperature": 0.7, "max_tokens": 2000}'
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
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 权限不足（非管理员角色）
 */
// 获取模型列表（管理员和终端用户都可以访问）
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY, ROLES.USER, ROLES.BASIC_USER),
    getModelsValidator,
    validate,
    modelController.getModels.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}:
 *   get:
 *     summary: 获取模型详情 [管理员/终端用户]
 *     description: |
 *       获取指定模型的详细信息，包括提供商信息、价格信息等。
 *       
 *       **权限说明**：
 *       - **管理员角色**：super_admin、platform_admin、read_only 可访问
 *       - **终端用户角色**：user、basic_user 可访问（仅查看）
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
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
 *                   example: "Model detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 模型ID
 *                     name:
 *                       type: string
 *                       description: 模型内部标识
 *                     displayName:
 *                       type: string
 *                       description: 模型显示名称
 *                     type:
 *                       type: string
 *                       enum: [llm, video, image, tts]
 *                       description: 模型类型
 *                     category:
 *                       type: string
 *                       nullable: true
 *                       description: 模型分类
 *                     providerId:
 *                       type: string
 *                       description: 提供商ID
 *                     provider:
 *                       type: object
 *                       description: 提供商信息
 *                     baseUrl:
 *                       type: string
 *                       description: 接口路径
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: 描述信息
 *                     isActive:
 *                       type: boolean
 *                       description: 是否启用
 *                     requiresKey:
 *                       type: boolean
 *                       description: 是否需要API密钥
 *                     apiConfig:
 *                       type: string
 *                       nullable: true
 *                       description: API配置参数（JSON字符串）
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
 *         description: 模型不存在
 */
// 获取模型详情（管理员和终端用户都可以访问）
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY, ROLES.USER, ROLES.BASIC_USER),
    validate,
    modelController.getModelDetail.bind(modelController)
);

/**
 * @swagger
 * /api/models:
 *   post:
 *     summary: 创建模型
 *     tags: [模型管理]
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
 *               - type
 *               - providerId
 *               - baseUrl
 *             properties:
 *               name:
 *                 type: string
 *                 example: deepseek-chat
 *                 description: 模型内部标识
 *               displayName:
 *                 type: string
 *                 example: DeepSeek Chat
 *                 description: 模型显示名称
 *               type:
 *                 type: string
 *                 enum: [llm, video, image, tts]
 *                 example: llm
 *                 description: 模型类型
 *               category:
 *                 type: string
 *                 example: chat
 *                 description: 模型分类
 *               providerId:
 *                 type: string
 *                 example: clx123456789
 *                 description: 提供商ID
 *               baseUrl:
 *                 type: string
 *                 example: /v1/chat/completions
 *                 description: 接口路径
 *               description:
 *                 type: string
 *                 description: 描述信息
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: 是否启用
 *               requiresKey:
 *                 type: boolean
 *                 default: false
 *                 description: 是否需要API密钥
 *               apiConfig:
 *                 type: string
 *                 example: '{"temperature": 0.7, "max_tokens": 2000}'
 *                 description: API配置参数（JSON字符串），存储每个模型独有的请求参数
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 请求参数错误
 */
// 创建模型
router.post(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    createModelValidator,
    validate,
    modelController.createModel.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}:
 *   put:
 *     summary: 更新模型
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: DeepSeek Chat
 *                 description: 模型显示名称
 *               type:
 *                 type: string
 *                 enum: [llm, video, image, tts]
 *                 description: 模型类型
 *               category:
 *                 type: string
 *                 description: 模型分类
 *               baseUrl:
 *                 type: string
 *                 example: /v1/chat/completions
 *                 description: 接口路径
 *               description:
 *                 type: string
 *                 description: 描述信息
 *               isActive:
 *                 type: boolean
 *                 description: 是否启用
 *               requiresKey:
 *                 type: boolean
 *                 description: 是否需要API密钥
 *               apiConfig:
 *                 type: string
 *                 example: '{"temperature": 0.7, "max_tokens": 2000}'
 *                 description: API配置参数（JSON字符串），存储每个模型独有的请求参数
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 模型不存在
 */
// 更新模型
router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    updateModelValidator,
    validate,
    modelController.updateModel.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}/status:
 *   patch:
 *     summary: 更新模型状态
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
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
 *                 description: 是否启用
 *     responses:
 *       200:
 *         description: 更新成功
 */
// 更新模型状态
router.patch(
    '/:id/status',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    updateModelValidator,
    validate,
    modelController.updateModelStatus.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}:
 *   delete:
 *     summary: 删除模型
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 模型不存在
 */
// 删除模型
router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    modelController.deleteModel.bind(modelController)
);

/**
 * @swagger
 * /api/models/batch/status:
 *   patch:
 *     summary: 批量更新模型状态
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *               - isActive
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [clx123, clx456]
 *                 description: 模型ID数组
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: 是否启用
 *     responses:
 *       200:
 *         description: 批量更新成功
 */
// 批量更新模型状态
router.patch(
    '/batch/status',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    batchUpdateStatusValidator,
    validate,
    modelController.batchUpdateStatus.bind(modelController)
);

/**
 * @swagger
 * /api/models/batch:
 *   delete:
 *     summary: 批量删除模型
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [clx123, clx456]
 *                 description: 模型ID数组
 *     responses:
 *       200:
 *         description: 批量删除成功
 */
// 批量删除模型
router.delete(
    '/batch',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    batchDeleteValidator,
    validate,
    modelController.batchDelete.bind(modelController)
);

/**
 * @swagger
 * /api/models/prices:
 *   post:
 *     summary: 获取模型价格列表（分页查询）
 *     description: |
 *       获取模型价格配置列表，支持多条件筛选和分页查询。
 *       
 *       **筛选说明：**
 *       - `modelId`：可选，不传则返回全部模型的价格列表
 *       - `packageId`：可选，筛选特定套餐的价格
 *       - `pricingType`：可选，筛选计价类型（token/call）
 *       - 时间筛选：支持按生效时间和过期时间范围筛选
 *       
 *       **返回数据说明：**
 *       - `maxToken`：仅在 `pricingType` 为 `token` 时有效
 *       - `inputPrice/outputPrice`：仅在 `pricingType` 为 `token` 时有值
 *       - `callPrice`：仅在 `pricingType` 为 `call` 时有值
 *       
 *       **使用示例：**
 *       ```bash
 *       # 获取所有价格
 *       curl -X POST "http://localhost:5800/api/models/prices" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "page": 1,
 *           "pageSize": 20
 *         }'
 *       
 *       # 获取特定模型的价格
 *       curl -X POST "http://localhost:5800/api/models/prices" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "modelId": "model_123",
 *           "pricingType": "token",
 *           "page": 1,
 *           "pageSize": 20
 *         }'
 *       ```
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelId:
 *                 type: string
 *                 description: 模型ID（可选，不传则返回全部模型的价格列表）
 *                 example: clx123456789
 *               page:
 *                 type: integer
 *                 default: 1
 *                 minimum: 1
 *                 description: 页码
 *                 example: 1
 *               pageSize:
 *                 type: integer
 *                 default: 20
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: 每页数量
 *                 example: 20
 *               packageId:
 *                 type: string
 *                 description: 套餐ID（可选，用于筛选特定套餐的价格）
 *                 example: clx123456789
 *               pricingType:
 *                 type: string
 *                 enum: [token, call]
 *                 description: 计价类型筛选（可选）
 *                 example: token
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: 生效开始时间（可选）
 *                 example: "2024-01-01T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: 生效结束时间（可选）
 *                 example: "2024-12-31T23:59:59Z"
 *               expiredStartDate:
 *                 type: string
 *                 format: date-time
 *                 description: 过期开始时间（可选）
 *                 example: "2024-01-01T00:00:00Z"
 *               expiredEndDate:
 *                 type: string
 *                 format: date-time
 *                 description: 过期结束时间（可选）
 *                 example: "2024-12-31T23:59:59Z"
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: 价格ID
 *                           modelId:
 *                             type: string
 *                             description: 模型ID
 *                           packageId:
 *                             type: string
 *                             nullable: true
 *                             description: 套餐ID
 *                           pricingType:
 *                             type: string
 *                             enum: [token, call]
 *                             description: 计价类型
 *                           inputPrice:
 *                             type: number
 *                             format: decimal
 *                             description: 输入Token单价（积分）
 *                           outputPrice:
 *                             type: number
 *                             format: decimal
 *                             description: 输出Token单价（积分）
 *                           callPrice:
 *                             type: number
 *                             format: decimal
 *                             description: 调用次数单价（积分）
 *                           maxToken:
 *                             type: integer
 *                             nullable: true
 *                             example: 8192
 *                             description: |
 *                               最大Token数（pricingType为token时使用），用于预估费用计算
 *                               - null：表示不限制，使用用户提供的estimatedTokens
 *                               - 正整数：表示该模型的最大token数，预估费用计算时会优先使用此值
 *                               - 例如：gemini-2.5-flash-image模型如果设置了maxToken=8192，则预估费用按maxToken计算
 *                           effectiveAt:
 *                             type: string
 *                             format: date-time
 *                             description: 生效时间
 *                           expiredAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: 过期时间
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 创建时间
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             description: 更新时间
 *                           model:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               displayName:
 *                                 type: string
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
 *                       field: "page",
 *                       message: "Page must be a positive integer"
 *                     }
 *                   ]
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 获取模型价格列表（POST分页查询）
router.post(
    '/prices',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getModelPricesValidator,
    validate,
    modelController.getModelPrices.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}/prices/create:
 *   post:
 *     summary: 创建模型价格
 *     description: |
 *       为指定模型创建价格配置。
 *       
 *       **计价类型说明：**
 *       - **token（按Token计价）**：需要设置 `inputPrice` 和 `outputPrice`，可选设置 `maxToken`
 *       - **call（按调用次数计价）**：需要设置 `callPrice`，`maxToken` 字段无效
 *       
 *       **maxToken字段说明：**
 *       - 仅在 `pricingType` 为 `token` 时有效
 *       - `null` 或空：表示不限制，预估费用计算时使用用户提供的 `estimatedTokens`
 *       - 正整数：表示该模型的最大token数，预估费用计算时会优先使用此值
 *       - 例如：`gemini-2.5-flash-image` 模型如果设置了 `maxToken=8192`，则无论用户传入多少 `estimatedTokens`，预估费用都按 `maxToken=8192` 计算
 *       
 *       **套餐价格说明：**
 *       - `packageId` 为 `null` 或空：表示默认价格，适用于所有套餐
 *       - `packageId` 有值：表示该套餐的专属价格，优先级高于默认价格
 *       
 *       **使用示例：**
 *       ```bash
 *       # 创建默认价格（按Token计价，带maxToken）
 *       curl -X POST "http://localhost:5800/api/models/{id}/prices/create" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "pricingType": "token",
 *           "inputPrice": 0.001,
 *           "outputPrice": 0.002,
 *           "maxToken": 8192,
 *           "effectiveAt": "2024-01-01T00:00:00Z"
 *         }'
 *       
 *       # 创建套餐专属价格（按调用次数计价）
 *       curl -X POST "http://localhost:5800/api/models/{id}/prices/create" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "packageId": "package_123",
 *           "pricingType": "call",
 *           "callPrice": 0.1,
 *           "effectiveAt": "2024-01-01T00:00:00Z"
 *         }'
 *       ```
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageId:
 *                 type: string
 *                 description: 套餐ID（可选，null表示默认价格）
 *               pricingType:
 *                 type: string
 *                 enum: [token, call]
 *                 default: token
 *                 description: 计价类型：token(按Token计价)、call(按调用次数计价)
 *                 example: token
 *               inputPrice:
 *                 type: number
 *                 format: decimal
 *                 example: 0.001
 *                 description: 输入Token单价（积分），pricingType为token时使用
 *               outputPrice:
 *                 type: number
 *                 format: decimal
 *                 example: 0.002
 *                 description: 输出Token单价（积分），pricingType为token时使用
 *               callPrice:
 *                 type: number
 *                 format: decimal
 *                 example: 0.1
 *                 description: 调用次数单价（积分），pricingType为call时使用
 *               maxToken:
 *                 type: integer
 *                 nullable: true
 *                 example: 8192
 *                 description: |
 *                   最大Token数（pricingType为token时使用），用于预估费用计算
 *                   
 *                   **字段说明：**
 *                   - `null` 或空：表示不限制，使用用户提供的estimatedTokens
 *                   - 正整数：表示该模型的最大token数，预估费用计算时会优先使用此值
 *                   
 *                   **计费逻辑示例：**
 *                   假设模型 `gemini-2.5-flash-image` 的价格配置：
 *                   - `pricingType`: `token`
 *                   - `maxToken`: `8192`
 *                   - `inputPrice`: `0.001`
 *                   - `outputPrice`: `0.002`
 *                   
 *                   用户申请授权时传入 `estimatedTokens=10000`：
 *                   - 由于设置了 `maxToken=8192`，预估费用按 `maxToken` 计算（而不是10000）
 *                   - 预估输入token：`8192 * 0.5 = 4096`
 *                   - 预估输出token：`8192 * 0.5 = 4096`
 *                   - 预估费用：`0.001 * 4096 + 0.002 * 4096 = 12.288` 积分
 *                   
 *                   如果 `maxToken` 为 `null`：
 *                   - 使用用户提供的 `estimatedTokens=10000`
 *                   - 预估输入token：`10000 * 0.5 = 5000`
 *                   - 预估输出token：`10000 * 0.5 = 5000`
 *                   - 预估费用：`0.001 * 5000 + 0.002 * 5000 = 15` 积分
 *               effectiveAt:
 *                 type: string
 *                 format: date-time
 *                 description: 生效时间
 *               expiredAt:
 *                 type: string
 *                 format: date-time
 *                 description: 过期时间（可选）
 *     responses:
 *       201:
 *         description: 创建成功
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
 *                           example: "price_123456"
 *                         modelId:
 *                           type: string
 *                           example: "model_123"
 *                         packageId:
 *                           type: string
 *                           nullable: true
 *                           example: "package_123"
 *                         pricingType:
 *                           type: string
 *                           enum: [token, call]
 *                           example: "token"
 *                         inputPrice:
 *                           type: number
 *                           format: decimal
 *                           example: 0.001
 *                         outputPrice:
 *                           type: number
 *                           format: decimal
 *                           example: 0.002
 *                         callPrice:
 *                           type: number
 *                           format: decimal
 *                           example: 0.1
 *                         maxToken:
 *                           type: integer
 *                           nullable: true
 *                           example: 8192
 *                           description: 最大Token数（pricingType为token时使用）
 *                         effectiveAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
 *                         expiredAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: "2024-12-31T23:59:59Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
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
 *                       field: "inputPrice",
 *                       message: "Input price is required when pricing type is token"
 *                     }
 *                   ]
 *       404:
 *         description: 模型不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 创建模型价格
router.post(
    '/:id/prices/create',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    createModelPriceValidator,
    validate,
    modelController.createModelPrice.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}/prices/{priceId}:
 *   put:
 *     summary: 更新模型价格
 *     description: |
 *       更新指定模型的价格配置。
 *       
 *       **更新说明：**
 *       - 所有字段都是可选的，只更新提供的字段
 *       - 更新后会自动清除相关缓存，确保价格计算使用最新配置
 *       
 *       **maxToken字段更新：**
 *       - 如果 `pricingType` 为 `token`，可以更新 `maxToken`
 *       - 设置为 `null` 表示移除限制
 *       - 设置为正整数表示设置新的最大token数
 *       
 *       **使用示例：**
 *       ```bash
 *       # 更新maxToken
 *       curl -X PUT "http://localhost:5800/api/models/{id}/prices/{priceId}" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "maxToken": 16384
 *         }'
 *       
 *       # 移除maxToken限制
 *       curl -X PUT "http://localhost:5800/api/models/{id}/prices/{priceId}" \
 *         -H "Authorization: Bearer {token}" \
 *         -H "Content-Type: application/json" \
 *         -d '{
 *           "maxToken": null
 *         }'
 *       ```
 *     tags: [模型管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
 *       - in: path
 *         name: priceId
 *         required: true
 *         schema:
 *           type: string
 *         description: 价格ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pricingType:
 *                 type: string
 *                 enum: [token, call]
 *                 description: 计价类型：token(按Token计价)、call(按调用次数计价)
 *               inputPrice:
 *                 type: number
 *                 format: decimal
 *                 description: 输入Token单价（积分），pricingType为token时使用
 *               outputPrice:
 *                 type: number
 *                 format: decimal
 *                 description: 输出Token单价（积分），pricingType为token时使用
 *               callPrice:
 *                 type: number
 *                 format: decimal
 *                 description: 调用次数单价（积分），pricingType为call时使用
 *               maxToken:
 *                 type: integer
 *                 nullable: true
 *                 example: 8192
 *                 description: |
 *                   最大Token数（pricingType为token时使用），用于预估费用计算
 *                   
 *                   **字段说明：**
 *                   - `null` 或空：表示不限制，使用用户提供的estimatedTokens
 *                   - 正整数：表示该模型的最大token数，预估费用计算时会优先使用此值
 *                   
 *                   **计费逻辑：**
 *                   - 如果设置了 `maxToken`，预估费用计算时会优先使用 `maxToken`（即使 `estimatedTokens` 更大）
 *                   - 如果 `maxToken` 为 `null`，使用用户提供的 `estimatedTokens`
 *                   - 例如：`gemini-2.5-flash-image` 模型如果设置了 `maxToken=8192`，则预估费用按 `maxToken` 计算
 *               effectiveAt:
 *                 type: string
 *                 format: date-time
 *                 description: 生效时间
 *               expiredAt:
 *                 type: string
 *                 format: date-time
 *                 description: 过期时间（可选）
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                           example: "price_123456"
 *                         modelId:
 *                           type: string
 *                           example: "model_123"
 *                         packageId:
 *                           type: string
 *                           nullable: true
 *                           example: "package_123"
 *                         pricingType:
 *                           type: string
 *                           enum: [token, call]
 *                           example: "token"
 *                         inputPrice:
 *                           type: number
 *                           format: decimal
 *                           example: 0.001
 *                         outputPrice:
 *                           type: number
 *                           format: decimal
 *                           example: 0.002
 *                         callPrice:
 *                           type: number
 *                           format: decimal
 *                           example: 0.1
 *                         maxToken:
 *                           type: integer
 *                           nullable: true
 *                           example: 8192
 *                           description: 最大Token数（pricingType为token时使用）
 *                         effectiveAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
 *                         expiredAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: "2024-12-31T23:59:59Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00Z"
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
 *                       field: "inputPrice",
 *                       message: "Input price is required when pricing type is token"
 *                     }
 *                   ]
 *       404:
 *         description: 价格不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Model price not found"
 */
// 更新模型价格
router.put(
    '/:id/prices/:priceId',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    updateModelPriceValidator,
    validate,
    modelController.updateModelPrice.bind(modelController)
);

module.exports = router;
