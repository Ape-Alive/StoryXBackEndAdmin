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
 *     summary: 获取模型列表
 *     tags: [模型管理]
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
 *         name: name
 *         schema:
 *           type: string
 *         description: 模型名称搜索
 *       - in: query
 *         name: displayName
 *         schema:
 *           type: string
 *         description: 显示名称搜索
 *       - in: query
 *         name: baseUrl
 *         schema:
 *           type: string
 *         description: 接口路径搜索
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [llm, video, image, tts]
 *         description: 模型类型
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 模型分类
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: 提供商ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用
 *       - in: query
 *         name: requiresKey
 *         schema:
 *           type: boolean
 *         description: 是否需要API密钥
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
 */
// 获取模型列表
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    getModelsValidator,
    validate,
    modelController.getModels.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}:
 *   get:
 *     summary: 获取模型详情
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
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: 模型不存在
 */
// 获取模型详情
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
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
 * /api/models/{id}/prices:
 *   get:
 *     summary: 获取模型价格列表
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
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID（可选，用于筛选特定套餐的价格）
 *     responses:
 *       200:
 *         description: 获取成功
 */
// 获取模型价格列表
router.get(
    '/:id/prices',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    validate,
    modelController.getModelPrices.bind(modelController)
);

/**
 * @swagger
 * /api/models/{id}/prices:
 *   post:
 *     summary: 创建模型价格
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
 */
// 创建模型价格
router.post(
    '/:id/prices',
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
 *       404:
 *         description: 价格不存在
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
