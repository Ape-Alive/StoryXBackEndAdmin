const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');
const userPackageController = require('../controllers/userPackage.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    getPackagesValidator,
    createPackageValidator,
    updatePackageValidator,
    duplicatePackageValidator
} = require('../validators/package.validator');
const { ROLES } = require('../constants/roles');
const { body, param, query } = require('express-validator');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/packages:
 *   get:
 *     summary: 获取套餐列表
 *     tags: [套餐管理]
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
 *         description: 套餐名称搜索
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [free, paid, trial]
 *         description: 套餐类型
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    getPackagesValidator,
    validate,
    packageController.getPackages.bind(packageController)
);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     summary: 获取套餐详情
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 套餐ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 套餐不存在
 */
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    validate,
    packageController.getPackageDetail.bind(packageController)
);

router.post(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    createPackageValidator,
    validate,
    packageController.createPackage.bind(packageController)
);

router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    updatePackageValidator,
    validate,
    packageController.updatePackage.bind(packageController)
);

router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    packageController.deletePackage.bind(packageController)
);

/**
 * @swagger
 * /api/packages/{id}/duplicate:
 *   post:
 *     summary: 复制套餐
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    '/:id/duplicate',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    duplicatePackageValidator,
    validate,
    packageController.duplicatePackage.bind(packageController)
);

/**
 * @swagger
 * /api/packages/user-packages:
 *   get:
 *     summary: 获取用户套餐列表
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/user-packages/list',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    userPackageController.getUserPackages.bind(userPackageController)
);

/**
 * @swagger
 * /api/packages/user-packages/{id}:
 *   get:
 *     summary: 获取用户套餐详情
 *     tags: [套餐管理]
 *   patch:
 *     summary: 更新套餐优先级
 *     tags: [套餐管理]
 *   delete:
 *     summary: 取消用户套餐
 *     tags: [套餐管理]
 */
router.get(
    '/user-packages/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    validate,
    userPackageController.getUserPackageDetail.bind(userPackageController)
);

router.post(
    '/user-packages/assign',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('packageId').notEmpty().withMessage('Package ID is required'),
        body('priority').optional().isInt().withMessage('Priority must be an integer')
    ],
    validate,
    userPackageController.assignPackage.bind(userPackageController)
);

router.patch(
    '/user-packages/:id/priority',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    [body('priority').notEmpty().isInt().withMessage('Priority must be an integer')],
    validate,
    userPackageController.updatePriority.bind(userPackageController)
);

router.patch(
    '/user-packages/:id/extend',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    [body('days').notEmpty().isInt({ min: 1 }).withMessage('Days must be a positive integer')],
    validate,
    userPackageController.extendPackage.bind(userPackageController)
);

router.delete(
    '/user-packages/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    validate,
    userPackageController.cancelUserPackage.bind(userPackageController)
);

router.get(
    '/users/:userId/active-packages',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    validate,
    userPackageController.getUserActivePackages.bind(userPackageController)
);

module.exports = router;
