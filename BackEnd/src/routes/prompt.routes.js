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
 * /api/prompts:
 *   get:
 *     summary: 获取提示词列表
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: 创建提示词
 *     tags: [提示词库]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    promptController.getPrompts.bind(promptController)
);

router.post(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required'),
        body('categoryId').notEmpty().withMessage('Category ID is required'),
        body('type').isIn(['system', 'user', 'shared']).withMessage('Invalid prompt type')
    ],
    validate,
    promptController.createPrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}:
 *   get:
 *     summary: 获取提示词详情
 *     tags: [提示词库]
 *   put:
 *     summary: 更新提示词
 *     tags: [提示词库]
 *   delete:
 *     summary: 删除提示词
 *     tags: [提示词库]
 */
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    validate,
    promptController.getPromptDetail.bind(promptController)
);

router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    promptController.updatePrompt.bind(promptController)
);

router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    promptController.deletePrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}/versions:
 *   get:
 *     summary: 获取提示词版本列表
 *     tags: [提示词库]
 */
router.get(
    '/:id/versions',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    validate,
    promptController.getPromptVersions.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/{id}/rollback:
 *   post:
 *     summary: 回滚提示词到指定版本
 *     tags: [提示词库]
 */
router.post(
    '/:id/rollback',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [body('version').notEmpty().isInt().withMessage('Version must be an integer')],
    validate,
    promptController.rollbackPrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/categories:
 *   get:
 *     summary: 获取提示词分类列表
 *     tags: [提示词库]
 *   post:
 *     summary: 创建提示词分类
 *     tags: [提示词库]
 */
router.get(
    '/categories',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    promptController.getCategories.bind(promptController)
);

router.post(
    '/categories',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        body('name').notEmpty().withMessage('Category name is required'),
        body('displayName').notEmpty().withMessage('Display name is required'),
        body('type').isIn(['system', 'user', 'shared']).withMessage('Invalid category type')
    ],
    validate,
    promptController.createCategory.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/categories/{id}:
 *   put:
 *     summary: 更新提示词分类
 *     tags: [提示词库]
 *   delete:
 *     summary: 删除提示词分类
 *     tags: [提示词库]
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

module.exports = router;
