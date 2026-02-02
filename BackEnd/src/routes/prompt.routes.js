const express = require('express');
const router = express.Router();
const promptController = require('../controllers/prompt.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, param, query } = require('express-validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: 提示词库
 *   description: 提示词管理相关接口
 */

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: 获取提示词列表 [管理员/终端用户]
 *     description: |
 *       获取提示词列表，支持多条件筛选和分页。
 *       权限说明：
 *       - 管理员：可以查看所有类型的提示词
 *       - 终端用户：可以查看system和system_user类型提示词，以及自己的user类型提示词
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: 标题关键词（模糊搜索）
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: 分类ID筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [system, system_user, user]
 *         description: 提示词类型筛选
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选（管理员可用）
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用筛选
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签关键词搜索
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建开始时间
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建结束时间
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序顺序
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title]
 *           default: createdAt
 *         description: 排序字段
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
 *                         description: 提示词ID
 *                         example: "clx123456789"
 *                       title:
 *                         type: string
 *                         description: 标题
 *                         example: "Python代码生成助手"
 *                       content:
 *                         type: string
 *                         description: 提示词内容
 *                         example: "你是一个专业的Python代码生成助手..."
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: 描述
 *                       categoryId:
 *                         type: string
 *                         description: 分类ID
 *                       category:
 *                         type: object
 *                         description: 分类信息
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                       type:
 *                         type: string
 *                         enum: [system, system_user, user]
 *                         description: 提示词类型
 *                       userId:
 *                         type: string
 *                         nullable: true
 *                         description: 用户ID（仅user类型有值）
 *                       systemId:
 *                         type: string
 *                         nullable: true
 *                         description: 关联的system提示词ID（system_user和user类型使用）
 *                       system:
 *                         type: object
 *                         nullable: true
 *                         description: 关联的system提示词信息
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                       version:
 *                         type: integer
 *                         description: 当前版本号
 *                       versionCount:
 *                         type: integer
 *                         description: 版本总数
 *                       isActive:
 *                         type: boolean
 *                         description: 是否启用
 *                       tags:
 *                         type: string
 *                         nullable: true
 *                         description: 标签（JSON字符串）
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
 *       403:
 *         description: 权限不足
 */
// 获取提示词列表：管理员和终端用户都可以访问
router.get(
    '/',
    promptController.getPrompts.bind(promptController)
);

/**
 * @swagger
 * /api/prompts:
 *   post:
 *     summary: 创建提示词 [管理员/终端用户]
 *     description: |
 *       创建新的提示词。
 *       权限说明：
 *       - system, system_user：仅管理员可创建
 *       - user：仅终端用户可创建（管理员应使用system_user）
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - functionKey
 *               - title
 *               - content
 *               - categoryId
 *               - type
 *             properties:
 *               functionKey:
 *                 type: string
 *                 description: 功能键（唯一标识）
 *                 example: "code_generator"
 *               title:
 *                 type: string
 *                 description: 提示词标题
 *                 example: "Python代码生成助手"
 *               content:
 *                 type: string
 *                 description: 提示词内容
 *                 example: "你是一个专业的Python代码生成助手，请根据用户需求生成高质量的Python代码。"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: 提示词描述
 *                 example: "用于生成Python代码的提示词模板"
 *               categoryId:
 *                 type: string
 *                 description: 分类ID（必填）
 *                 example: "clx111222333"
 *               type:
 *                 type: string
 *                 enum: [system, system_user, user]
 *                 description: |
 *                   提示词类型：
 *                   - system: 系统提示词（仅管理员CRUD，终端用户可查看）
 *                   - system_user: 系统用户提示词（仅管理员CRUD，终端用户可查看，可关联system）
 *                   - user: 终端用户提示词（管理员和终端用户都能CRUD，可关联system）
 *                 example: "user"
 *               systemId:
 *                 type: string
 *                 nullable: true
 *                 description: 关联的system类型提示词ID（system_user和user类型可选，必须指向type为system的提示词）
 *                 example: "clx111222333"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 description: 标签数组
 *                 example: ["python", "代码生成"]
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Prompt created successfully"
 *                 data:
 *                   type: object
 *                   description: 创建的提示词信息
 *                   properties:
 *                     id:
 *                       type: string
 *                     functionKey:
 *                       type: string
 *                       description: 功能键（唯一标识）
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     type:
 *                       type: string
 *                     categoryId:
 *                       type: string
 *                     systemId:
 *                       type: string
 *                       nullable: true
 *                     userId:
 *                       type: string
 *                       nullable: true
 *                     version:
 *                       type: integer
 *                     isActive:
 *                       type: boolean
 *                     category:
 *                       type: object
 *                     system:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: 请求参数错误、分类不存在或systemId指向的提示词不是system类型
 *       403:
 *         description: 权限不足（非管理员尝试创建系统类型提示词，或管理员尝试创建user类型）
 *       404:
 *         description: 分类不存在或systemId指向的提示词不存在
 */
// 创建提示词：管理员和终端用户都可以创建（权限在service层控制）
router.post(
    '/',
    [
        body('functionKey').notEmpty().withMessage('Function key is required'),
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required'),
        body('categoryId').notEmpty().withMessage('Category ID is required'),
        body('type').isIn(['system', 'system_user', 'user']).withMessage('Invalid prompt type')
    ],
    validate,
    promptController.createPrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}:
 *   get:
 *     summary: 获取提示词详情 [管理员/终端用户]
 *     description: |
 *       获取指定提示词的详细信息，包含分类和版本信息。
 *       权限说明：
 *       - 管理员：可以查看所有类型的提示词
 *       - 终端用户：只能查看自己的user类型提示词和所有shared类型提示词
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提示词ID
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
 *                   example: "Prompt detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: 提示词详情
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 提示词ID
 *                       example: "clx123456789"
 *                     functionKey:
 *                       type: string
 *                       description: 功能键（唯一标识）
 *                       example: "code_generator"
 *                     title:
 *                       type: string
 *                       description: 标题
 *                       example: "Python代码生成助手"
 *                     content:
 *                       type: string
 *                       description: 提示词内容
 *                       example: "你是一个专业的Python代码生成助手..."
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: 描述
 *                     categoryId:
 *                       type: string
 *                       description: 分类ID
 *                     category:
 *                       type: object
 *                       description: 分类信息
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                         type:
 *                           type: string
 *                     type:
 *                       type: string
 *                       enum: [system, system_user, user]
 *                       description: 提示词类型
 *                     userId:
 *                       type: string
 *                       nullable: true
 *                       description: 用户ID（仅user类型有值）
 *                     systemId:
 *                       type: string
 *                       nullable: true
 *                       description: 关联的system提示词ID（system_user和user类型使用）
 *                     system:
 *                       type: object
 *                       nullable: true
 *                       description: 关联的system提示词信息
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         type:
 *                           type: string
 *                     children:
 *                       type: array
 *                       description: 关联的子提示词列表（仅system类型有值，包含system_user和user类型）
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                           userId:
 *                             type: string
 *                             nullable: true
 *                     version:
 *                       type: integer
 *                       description: 当前版本号
 *                     isActive:
 *                       type: boolean
 *                       description: 是否启用
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       nullable: true
 *                       description: 标签数组
 *                     versions:
 *                       type: array
 *                       description: 版本列表（最近10个）
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           promptId:
 *                             type: string
 *                           version:
 *                             type: integer
 *                           content:
 *                             type: string
 *                           updatedBy:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *       403:
 *         description: 权限不足（终端用户尝试查看无权访问的提示词）
 *       404:
 *         description: 提示词不存在
 */
// 获取提示词详情：管理员和终端用户都可以访问（权限在service层控制）

/**
 * @swagger
 * /api/prompts/categories:
 *   get:
 *     summary: 获取提示词分类列表 [管理员]
 *     description: 获取所有提示词分类列表，用于创建提示词时选择分类
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 分类名称关键词（模糊搜索）
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
 *                   example: "Categories retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 分类ID
 *                         example: "clx111222333"
 *                       name:
 *                         type: string
 *                         description: 分类名称（唯一标识）
 *                         example: "code_assistant"
 *                       displayName:
 *                         type: string
 *                         description: 显示名称
 *                         example: "代码助手"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: 分类描述
 *                       _count:
 *                         type: object
 *                         properties:
 *                           prompts:
 *                             type: integer
 *                             description: 该分类下的提示词数量
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
router.get(
    '/categories',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    promptController.getCategories.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/categories:
 *   post:
 *     summary: 创建提示词分类 [管理员]
 *     description: 创建新的提示词分类，分类名称必须唯一
 *     tags: [提示词库]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: 分类名称（唯一标识，如 "code_assistant"）
 *                 example: "code_assistant"
 *               displayName:
 *                 type: string
 *                 description: 显示名称（如 "代码助手"）
 *                 example: "代码助手"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: 分类描述
 *                 example: "用于代码生成和优化的提示词分类"
 *     responses:
 *       201:
 *         description: 创建成功
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
 *                   example: "Category created successfully"
 *                 data:
 *                   type: object
 *                   description: 创建的分类信息
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 分类名称已存在
 */
// 创建分类：只有管理员可以创建
router.post(
    '/categories',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        body('name').notEmpty().withMessage('Category name is required'),
        body('displayName').notEmpty().withMessage('Display name is required')
    ],
    validate,
    promptController.createCategory.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/categories/{id}:
 *   put:
 *     summary: 更新提示词分类 [管理员]
 *     description: 更新提示词分类信息（分类名称name不可修改）
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 分类ID
 *         example: "clx111222333"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 description: 显示名称
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: 分类描述
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   example: "Category updated successfully"
 *                 data:
 *                   type: object
 *                   description: 更新后的分类信息
 *       404:
 *         description: 分类不存在
 *   delete:
 *     summary: 删除提示词分类 [管理员]
 *     description: 删除提示词分类，如果分类下有关联的提示词则不允许删除
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 分类ID
 *         example: "clx111222333"
 *     responses:
 *       200:
 *         description: 删除成功
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
 *                   example: "Category deleted successfully"
 *                 data:
 *                   type: null
 *       404:
 *         description: 分类不存在
 *       409:
 *         description: 分类下有关联的提示词，无法删除
 */
router.put(
    '/categories/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    promptController.updateCategory.bind(promptController)
);

router.delete(
    '/categories/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    promptController.deleteCategory.bind(promptController)
);

router.get(
    '/:id',
    promptController.getPromptDetail.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}:
 *   put:
 *     summary: 更新提示词 [管理员/终端用户]
 *     description: |
 *       更新提示词信息，更新时会自动创建新版本。
 *       权限说明：
 *       - system, system_user：仅管理员可更新
 *       - user：终端用户只能更新自己的，管理员可以更新所有
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提示词ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               functionKey:
 *                 type: string
 *                 description: 功能键（唯一标识，可选更新）
 *               title:
 *                 type: string
 *                 description: 提示词标题
 *               content:
 *                 type: string
 *                 description: 提示词内容
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: 提示词描述
 *               categoryId:
 *                 type: string
 *                 description: 分类ID
 *               systemId:
 *                 type: string
 *                 nullable: true
 *                 description: 关联的system类型提示词ID（system_user和user类型可选，必须指向type为system的提示词）
 *                 example: "clx111222333"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 description: 标签数组
 *               isActive:
 *                 type: boolean
 *                 description: 是否启用
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   example: "Prompt updated successfully"
 *                 data:
 *                   type: object
 *                   description: 更新后的提示词信息
 *                   properties:
 *                     id:
 *                       type: string
 *                     functionKey:
 *                       type: string
 *                       description: 功能键（唯一标识）
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     type:
 *                       type: string
 *                     version:
 *                       type: integer
 *                     systemId:
 *                       type: string
 *                       nullable: true
 *                     category:
 *                       type: object
 *                     system:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: systemId指向的提示词不是system类型
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 提示词不存在或systemId指向的提示词不存在
 */
// 更新提示词：管理员和终端用户都可以更新（权限在service层控制）
router.put(
    '/:id',
    promptController.updatePrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}:
 *   delete:
 *     summary: 删除提示词 [管理员/终端用户]
 *     description: |
 *       删除提示词（会级联删除所有版本记录）。
 *       权限说明：
 *       - system, system_user：仅管理员可删除
 *       - user：终端用户只能删除自己的，管理员可以删除所有
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提示词ID
 *         example: "clx123456789"
 *     responses:
 *       200:
 *         description: 删除成功
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
 *                   example: "Prompt deleted successfully"
 *                 data:
 *                   type: null
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 提示词不存在
 */
// 删除提示词：管理员和终端用户都可以删除（权限在service层控制）
router.delete(
    '/:id',
    promptController.deletePrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}/versions:
 *   get:
 *     summary: 获取提示词版本列表 [管理员/终端用户]
 *     description: 获取指定提示词的所有版本记录，按版本号降序排列
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提示词ID
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
 *                   example: "Prompt versions retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 版本记录ID
 *                       promptId:
 *                         type: string
 *                         description: 提示词ID
 *                       version:
 *                         type: integer
 *                         description: 版本号
 *                       content:
 *                         type: string
 *                         description: 该版本的内容
 *                       updatedBy:
 *                         type: string
 *                         nullable: true
 *                         description: 更新者ID
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *       404:
 *         description: 提示词不存在
 */
// 获取提示词版本列表：管理员和终端用户都可以访问（权限在service层控制）
router.get(
    '/:id/versions',
    promptController.getPromptVersions.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}/rollback:
 *   post:
 *     summary: 回滚提示词到指定版本 [管理员/终端用户]
 *     description: |
 *       将提示词回滚到指定版本，当前版本会自动保存到版本表。
 *       权限说明：
 *       - system, system_user：仅管理员可回滚
 *       - user：终端用户只能回滚自己的，管理员可以回滚所有
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 提示词ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *             properties:
 *               version:
 *                 type: integer
 *                 description: 要回滚到的版本号
 *                 example: 3
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: 回滚成功
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
 *                   example: "Prompt rolled back successfully"
 *                 data:
 *                   type: object
 *                   description: 回滚后的提示词信息
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     version:
 *                       type: integer
 *       400:
 *         description: 版本号无效
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 提示词不存在或版本不存在
 */
// 回滚提示词：管理员和终端用户都可以回滚（权限在service层控制）
router.post(
    '/:id/rollback',
    [body('version').notEmpty().isInt().withMessage('Version must be an integer')],
    validate,
    promptController.rollbackPrompt.bind(promptController)
);

module.exports = router;
