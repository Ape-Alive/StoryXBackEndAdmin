const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getProvidersValidator,
    createProviderValidator,
    updateProviderValidator,
    getProviderDetailValidator,
    updateProviderStatusValidator
} = require('../validators/provider.validator');
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

module.exports = router;