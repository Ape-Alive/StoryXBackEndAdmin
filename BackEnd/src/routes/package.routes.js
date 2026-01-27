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

/**
 * @swagger
 * /api/packages:
 *   post:
 *     summary: 创建套餐
 *     tags: [套餐管理]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: 套餐内部标识（唯一）
 *                 example: "premium_monthly"
 *               displayName:
 *                 type: string
 *                 description: 套餐显示名称
 *                 example: "高级套餐（月付）"
 *               description:
 *                 type: string
 *                 description: 套餐描述
 *                 example: "包含10000积分，支持所有模型"
 *               type:
 *                 type: string
 *                 enum: [free, paid, trial]
 *                 description: 套餐类型
 *                 example: "paid"
 *               duration:
 *                 type: integer
 *                 description: 有效期（天），null表示永久
 *                 example: 30
 *               quota:
 *                 type: number
 *                 format: decimal
 *                 description: 额度（积分），null表示无限
 *                 example: 10000.00
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: 套餐金额（付费套餐必填）
 *                 example: 99.00
 *               priceUnit:
 *                 type: string
 *                 enum: [CNY, USD]
 *                 description: 套餐金额单位
 *                 example: "CNY"
 *               discount:
 *                 type: number
 *                 format: decimal
 *                 description: 套餐折扣（百分比，0-100）
 *                 example: 10.00
 *               maxDevices:
 *                 type: integer
 *                 description: 最大设备数量，null表示无限
 *                 example: 5
 *               availableModels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 可用模型ID列表，null或空数组表示所有模型都可用
 *                 example: ["model1", "model2"]
 *               isStackable:
 *                 type: boolean
 *                 default: false
 *                 description: 是否可叠加
 *                 example: false
 *               priority:
 *                 type: integer
 *                 default: 0
 *                 description: 优先级，数字越大优先级越高
 *                 example: 10
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: 是否启用
 *                 example: true
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 套餐名称已存在
 */
router.post(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    createPackageValidator,
    validate,
    packageController.createPackage.bind(packageController)
);

/**
 * @swagger
 * /api/packages/{id}:
 *   put:
 *     summary: 更新套餐
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 description: 套餐显示名称
 *               description:
 *                 type: string
 *                 description: 套餐描述
 *               type:
 *                 type: string
 *                 enum: [free, paid, trial]
 *                 description: 套餐类型
 *               duration:
 *                 type: integer
 *                 description: 有效期（天），null表示永久
 *               quota:
 *                 type: number
 *                 format: decimal
 *                 description: 额度（积分），null表示无限
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: 套餐金额
 *               priceUnit:
 *                 type: string
 *                 enum: [CNY, USD]
 *                 description: 套餐金额单位
 *               discount:
 *                 type: number
 *                 format: decimal
 *                 description: 套餐折扣（百分比，0-100）
 *               maxDevices:
 *                 type: integer
 *                 description: 最大设备数量，null表示无限
 *               availableModels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 可用模型ID列表，null或空数组表示所有模型都可用
 *               isStackable:
 *                 type: boolean
 *                 description: 是否可叠加
 *               priority:
 *                 type: integer
 *                 description: 优先级
 *               isActive:
 *                 type: boolean
 *                 description: 是否启用
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 套餐不存在
 */
router.put(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    updatePackageValidator,
    validate,
    packageController.updatePackage.bind(packageController)
);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     summary: 删除套餐
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
 *         description: 删除成功
 *       404:
 *         description: 套餐不存在
 *       409:
 *         description: 套餐正在使用中，无法删除
 */
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 套餐ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newName
 *               - newDisplayName
 *             properties:
 *               newName:
 *                 type: string
 *                 description: 新套餐的内部标识（唯一）
 *                 example: "premium_monthly_v2"
 *               newDisplayName:
 *                 type: string
 *                 description: 新套餐的显示名称
 *                 example: "高级套餐（月付）V2"
 *     responses:
 *       201:
 *         description: 复制成功
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 套餐不存在
 *       409:
 *         description: 新套餐名称已存在
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
 * /api/packages/{id}/status:
 *   patch:
 *     summary: 更新套餐状态
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
 *                 description: 是否启用
 *                 example: true
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 套餐不存在
 */
router.patch(
    '/:id/status',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        param('id').notEmpty().withMessage('Package ID is required'),
        body('isActive').notEmpty().isBoolean().withMessage('isActive must be a boolean')
    ],
    validate,
    packageController.updatePackageStatus.bind(packageController)
);

/**
 * @swagger
 * /api/packages/batch/status:
 *   patch:
 *     summary: 批量更新套餐状态
 *     tags: [套餐管理]
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
 *                 description: 套餐ID数组
 *                 example: ["id1", "id2"]
 *               isActive:
 *                 type: boolean
 *                 description: 是否启用
 *                 example: true
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch(
    '/batch/status',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        body('ids').isArray({ min: 1 }).withMessage('IDs array is required'),
        body('isActive').notEmpty().isBoolean().withMessage('isActive must be a boolean')
    ],
    validate,
    packageController.batchUpdateStatus.bind(packageController)
);

/**
 * @swagger
 * /api/packages/batch:
 *   delete:
 *     summary: 批量删除套餐
 *     tags: [套餐管理]
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
 *                 description: 套餐ID数组
 *                 example: ["id1", "id2"]
 *     responses:
 *       200:
 *         description: 删除成功
 *       409:
 *         description: 部分套餐正在使用中，无法删除
 */
router.delete(
    '/batch',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    [
        body('ids').isArray({ min: 1 }).withMessage('IDs array is required')
    ],
    validate,
    packageController.batchDeletePackages.bind(packageController)
);

/**
 * @swagger
 * /api/packages/user-packages/list:
 *   get:
 *     summary: 获取用户套餐列表（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: 是否只返回活跃套餐
 *       - in: query
 *         name: expiresBefore
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 过期时间筛选（在此之前过期）
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
 *     responses:
 *       200:
 *         description: 获取成功
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
 *     summary: 获取用户套餐详情（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 用户套餐不存在
 */
router.get(
    '/user-packages/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    validate,
    userPackageController.getUserPackageDetail.bind(userPackageController)
);

/**
 * @swagger
 * /api/packages/user-packages/assign:
 *   post:
 *     summary: 分配套餐给用户（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - packageId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *                 example: "clx123456789"
 *               packageId:
 *                 type: string
 *                 description: 套餐ID
 *                 example: "clx987654321"
 *               priority:
 *                 type: integer
 *                 description: 套餐优先级（可选）
 *                 example: 10
 *     responses:
 *       201:
 *         description: 分配成功
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 用户或套餐不存在
 *       409:
 *         description: 用户已拥有该套餐
 */
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

/**
 * @swagger
 * /api/packages/user-packages/{id}/priority:
 *   patch:
 *     summary: 更新用户套餐优先级（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priority
 *             properties:
 *               priority:
 *                 type: integer
 *                 description: 新的优先级
 *                 example: 20
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 用户套餐不存在
 */
router.patch(
    '/user-packages/:id/priority',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    [body('priority').notEmpty().isInt().withMessage('Priority must be an integer')],
    validate,
    userPackageController.updatePriority.bind(userPackageController)
);

/**
 * @swagger
 * /api/packages/user-packages/{id}/extend:
 *   patch:
 *     summary: 延期用户套餐（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - days
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 description: 延期天数
 *                 example: 30
 *     responses:
 *       200:
 *         description: 延期成功
 *       404:
 *         description: 用户套餐不存在
 */
router.patch(
    '/user-packages/:id/extend',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    [body('days').notEmpty().isInt({ min: 1 }).withMessage('Days must be a positive integer')],
    validate,
    userPackageController.extendPackage.bind(userPackageController)
);

/**
 * @swagger
 * /api/packages/user-packages/{id}:
 *   delete:
 *     summary: 取消用户套餐（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户套餐ID
 *     responses:
 *       200:
 *         description: 取消成功
 *       404:
 *         description: 用户套餐不存在
 */
router.delete(
    '/user-packages/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR),
    validate,
    userPackageController.cancelUserPackage.bind(userPackageController)
);

/**
 * @swagger
 * /api/packages/users/{userId}/active-packages:
 *   get:
 *     summary: 获取用户的活跃套餐列表（管理员）
 *     tags: [套餐管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 用户不存在
 */
router.get(
    '/users/:userId/active-packages',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR, ROLES.READ_ONLY),
    validate,
    userPackageController.getUserActivePackages.bind(userPackageController)
);

module.exports = router;
