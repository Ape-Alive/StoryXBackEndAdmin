const express = require('express')
const router = express.Router()
const styleLibraryController = require('../controllers/styleLibrary.controller')
const { authenticate } = require('../middleware/auth')
const { requireEntitlement } = require('../middleware/entitlement')
const { requireAnyBackendMenuPermission } = require('../middleware/backendPermission')
const { requireAnyClientPermission } = require('../middleware/clientPermission')
const { CLIENT_API_PERMISSIONS } = require('../constants/clientApiPermissions')
const validate = require('../middleware/validate')
const {
  listStyleLibraryValidator,
  createStyleLibraryValidator,
  updateStyleLibraryValidator,
  deleteStyleLibraryValidator,
  idParamValidator,
} = require('../validators/styleLibrary.validator')

router.use(authenticate)
router.use(requireEntitlement)
router.use(requireAnyBackendMenuPermission('style-library'))
router.use(requireAnyClientPermission(...CLIENT_API_PERMISSIONS.RESOURCE_READ))

/**
 * @swagger
 * tags:
 *   name: 风格库
 *   description: 风格库条目管理（关联系统提示词）
 */

/**
 * @swagger
 * /api/style-library/meta:
 *   get:
 *     summary: 获取风格库元数据 [管理员/终端用户]
 *     description: 返回媒介类型与场景分类枚举，供客户端筛选条使用。
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/meta', styleLibraryController.getMeta.bind(styleLibraryController))

/**
 * @swagger
 * /api/style-library:
 *   get:
 *     summary: 获取风格库列表 [管理员/终端用户]
 *     description: |
 *       终端用户仅返回已上架（isActive=true）条目；管理员可查看全部并筛选 isActive。
 *       场景筛选传 scene 为 slug，如 architecture_interior。
 *
 *       **includeAll 参数说明**：
 *       - includeAll=true：忽略分页，一次性返回当前筛选条件下的全部条目（`pagination.pageSize` 等于 `total`）
 *       - 客户端初始化同步建议使用：`GET /api/style-library?includeAll=true&isActive=true`
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mediaType
 *         schema:
 *           type: string
 *           enum: [text, image, video, audio]
 *       - in: query
 *         name: scene
 *         schema:
 *           type: string
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recommend, hot, new, sortOrder]
 *           default: recommend
 *       - in: query
 *         name: includeAll
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 为 true 时忽略分页，一次性返回全部匹配条目
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/',
  listStyleLibraryValidator,
  validate,
  styleLibraryController.list.bind(styleLibraryController)
)

/**
 * @swagger
 * /api/style-library:
 *   post:
 *     summary: 创建风格库条目 [管理员]
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mediaType, content, tags]
 *             properties:
 *               name:
 *                 type: string
 *               mediaType:
 *                 type: string
 *                 enum: [text, image, video, audio]
 *               systemPromptIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关联的系统提示词 ID 列表（可选，可空数组表示不关联）
 *               content:
 *                 type: string
 *                 description: 风格提示词正文（核心字段）
 *               tags:
 *                 type: object
 *                 properties:
 *                   scenes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   labels:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
  '/',
  createStyleLibraryValidator,
  validate,
  styleLibraryController.create.bind(styleLibraryController)
)

/**
 * @swagger
 * /api/style-library/{id}:
 *   get:
 *     summary: 获取风格库详情 [管理员/终端用户]
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/:id',
  idParamValidator,
  validate,
  styleLibraryController.getDetail.bind(styleLibraryController)
)

/**
 * @swagger
 * /api/style-library/{id}:
 *   put:
 *     summary: 更新风格库条目 [管理员]
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
  '/:id',
  updateStyleLibraryValidator,
  validate,
  styleLibraryController.update.bind(styleLibraryController)
)

/**
 * @swagger
 * /api/style-library/{id}:
 *   delete:
 *     summary: 删除/下架风格库条目 [管理员]
 *     description: 默认软删（isActive=false）；传 hard=true 硬删。
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hard
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete(
  '/:id',
  deleteStyleLibraryValidator,
  validate,
  styleLibraryController.remove.bind(styleLibraryController)
)

/**
 * @swagger
 * /api/style-library/{id}/use:
 *   post:
 *     summary: 记录风格使用 [管理员/终端用户]
 *     description: usageCount 加 1，供广场热度统计。
 *     tags: [风格库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 记录成功
 */
router.post(
  '/:id/use',
  idParamValidator,
  validate,
  styleLibraryController.recordUse.bind(styleLibraryController)
)

module.exports = router
