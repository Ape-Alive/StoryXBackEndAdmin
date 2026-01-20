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
 *     summary: 获取提供商列表
 *     tags: [提供商管理]
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
 *         description: 提供商标识
 *       - in: query
 *         name: displayName
 *         schema:
 *           type: string
 *         description: 显示名称
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用
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
// 获取提供商列表（所有角色可查看）
router.get(
    '/',
    getProvidersValidator,
    validate,
    providerController.getProviders.bind(providerController)
);

/**
 * @swagger
 * /api/providers/{id}:
 *   get:
 *     summary: 获取提供商详情
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
 *         description: 获取成功
 *       404:
 *         description: 提供商不存在
 */
// 获取提供商详情（所有角色可查看）
router.get(
    '/:id',
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