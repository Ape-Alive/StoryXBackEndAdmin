const express = require('express');
const router = express.Router();
const userPackageController = require('../controllers/userPackage.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, param, query } = require('express-validator');

// 所有路由需要认证（终端用户和管理员都可以访问）
router.use(authenticate);

/**
 * @swagger
 * /api/user/packages/available:
 *   get:
 *     summary: 获取可订阅的套餐列表（终端用户）
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [free, paid, trial]
 *         description: 套餐类型筛选
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
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           type:
 *                             type: string
 *                           duration:
 *                             type: integer
 *                           quota:
 *                             type: number
 *                           price:
 *                             type: number
 *                           priceUnit:
 *                             type: string
 *                           discount:
 *                             type: number
 *                           maxDevices:
 *                             type: integer
 *                           isStackable:
 *                             type: boolean
 *                           priority:
 *                             type: integer
 */
router.get(
    '/available',
    [
        query('type').optional().isIn(['free', 'paid', 'trial']).withMessage('Invalid package type')
    ],
    validate,
    userPackageController.getAvailablePackages.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/subscribe:
 *   post:
 *     summary: 订阅套餐（终端用户）
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *             properties:
 *               packageId:
 *                 type: string
 *                 description: 套餐ID
 *                 example: "clx123456789"
 *               priority:
 *                 type: integer
 *                 description: 套餐优先级（可选）
 *                 example: 10
 *     responses:
 *       201:
 *         description: 订阅成功
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 套餐不存在或不可用
 *       409:
 *         description: 已订阅该套餐或套餐不可叠加
 */
router.post(
    '/subscribe',
    [
        body('packageId').notEmpty().withMessage('Package ID is required'),
        body('priority').optional().isInt().withMessage('Priority must be an integer')
    ],
    validate,
    userPackageController.subscribePackage.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/my-packages:
 *   get:
 *     summary: 获取我的套餐列表（终端用户）
 *     tags: [套餐订阅]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: 是否只返回活跃套餐
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
    '/my-packages',
    [
        query('activeOnly').optional().custom((value) => {
            if (value === 'true' || value === 'false' || value === true || value === false) {
                return true;
            }
            throw new Error('activeOnly must be a boolean');
        }),
        query('page').optional().isInt({ min: 1 }),
        query('pageSize').optional().isInt({ min: 1, max: 1000 })
    ],
    validate,
    userPackageController.getMyPackages.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/{id}:
 *   get:
 *     summary: 获取我的套餐详情（终端用户）
 *     tags: [套餐订阅]
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
 *         description: 套餐不存在或不属于当前用户
 */
router.get(
    '/:id',
    [
        param('id').notEmpty().withMessage('User package ID is required')
    ],
    validate,
    userPackageController.getMyPackageDetail.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/{id}/renew:
 *   post:
 *     summary: 续费套餐（终端用户）
 *     tags: [套餐订阅]
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
 *             properties:
 *               days:
 *                 type: integer
 *                 description: 续费天数（可选，默认使用套餐的duration）
 *                 example: 30
 *     responses:
 *       200:
 *         description: 续费成功
 *       404:
 *         description: 套餐不存在或不属于当前用户
 */
router.post(
    '/:id/renew',
    [
        param('id').notEmpty().withMessage('User package ID is required'),
        body('days').optional().isInt({ min: 1 }).withMessage('Days must be a positive integer')
    ],
    validate,
    userPackageController.renewPackage.bind(userPackageController)
);

/**
 * @swagger
 * /api/user/packages/{id}/unsubscribe:
 *   delete:
 *     summary: 取消订阅（终端用户）
 *     tags: [套餐订阅]
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
 *         description: 取消订阅成功
 *       404:
 *         description: 套餐不存在或不属于当前用户
 */
router.delete(
    '/:id/unsubscribe',
    [
        param('id').notEmpty().withMessage('User package ID is required')
    ],
    validate,
    userPackageController.unsubscribePackage.bind(userPackageController)
);

module.exports = router;

