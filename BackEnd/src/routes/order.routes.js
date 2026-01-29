const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createOrderValidator,
  getOrdersValidator,
  getOrderDetailValidator,
  cancelOrderValidator
} = require('../validators/order.validator');

/**
 * @swagger
 * tags:
 *   name: 订单管理
 *   description: 订单相关接口
 */

/**
 * @swagger
 * /api/user/orders:
 *   post:
 *     summary: 创建订单
 *     description: 为用户创建套餐购买订单，计算订单金额（考虑折扣）
 *     tags: [订单管理]
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
 *                 example: "clx111222333"
 *               type:
 *                 type: string
 *                 enum: [purchase, renewal, upgrade]
 *                 default: purchase
 *                 description: 订单类型（purchase=购买，renewal=续费，upgrade=升级）
 *                 example: "purchase"
 *     responses:
 *       201:
 *         description: 订单创建成功
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
 *                   example: "Order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 订单ID
 *                       example: "clx123456789"
 *                     orderNo:
 *                       type: string
 *                       description: 订单号
 *                       example: "ORDER17040672000001234"
 *                     userId:
 *                       type: string
 *                       description: 用户ID
 *                       example: "clx999888777"
 *                     packageId:
 *                       type: string
 *                       description: 套餐ID
 *                       example: "clx111222333"
 *                     type:
 *                       type: string
 *                       enum: [purchase, renewal, upgrade]
 *                       description: 订单类型
 *                       example: "purchase"
 *                     status:
 *                       type: string
 *                       enum: [pending, paid, cancelled, refunded, expired]
 *                       description: 订单状态（pending=待支付，paid=已支付，cancelled=已取消，refunded=已退款，expired=已过期）
 *                       example: "pending"
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                       description: 订单原价（元）
 *                       example: 100.00
 *                     discount:
 *                       type: number
 *                       format: decimal
 *                       nullable: true
 *                       description: 折扣（百分比，0-100）
 *                       example: 10.00
 *                     finalAmount:
 *                       type: number
 *                       format: decimal
 *                       description: 订单最终金额（元，已计算折扣）
 *                       example: 90.00
 *                     currency:
 *                       type: string
 *                       description: 货币单位
 *                       example: "CNY"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: 订单描述
 *                       example: "购买套餐：高级套餐（月付）"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 订单过期时间（超过此时间未支付将自动取消）
 *                       example: "2024-01-29T10:00:00.000Z"
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 支付时间
 *                       example: null
 *                     cancelledAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 取消时间
 *                       example: null
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                       example: "2024-01-28T10:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *                       example: "2024-01-28T10:00:00.000Z"
 *                     user:
 *                       type: object
 *                       description: 用户信息
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                     package:
 *                       type: object
 *                       description: 套餐信息
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                         type:
 *                           type: string
 *                         price:
 *                           type: number
 *       400:
 *         description: 请求参数错误或套餐不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Package not found"
 */
router.post(
  '/',
  authenticate,
  createOrderValidator,
  validate,
  orderController.createOrder
);

/**
 * @swagger
 * /api/user/orders:
 *   get:
 *     summary: 获取我的订单列表
 *     description: 获取当前用户的订单列表，支持分页和筛选
 *     tags: [订单管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled, refunded, expired]
 *         description: 订单状态筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [purchase, renewal, upgrade]
 *         description: 订单类型筛选
 *       - in: query
 *         name: orderNo
 *         schema:
 *           type: string
 *         description: 订单号（模糊搜索）
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, paidAt]
 *           default: createdAt
 *         description: 排序字段
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序顺序
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
 *                   description: 订单列表
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       orderNo:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, paid, cancelled, refunded, expired]
 *                       type:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       finalAmount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       paidAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                       package:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           type:
 *                             type: string
 *                       payments:
 *                         type: array
 *                         description: 支付记录列表（最多返回1条最新的）
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             status:
 *                               type: string
 *                             paymentMethod:
 *                               type: string
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
 */
router.get(
  '/',
  authenticate,
  getOrdersValidator,
  validate,
  orderController.getMyOrders
);

/**
 * @swagger
 * /api/user/orders/{id}:
 *   get:
 *     summary: 获取订单详情
 *     description: 获取指定订单的详细信息，包括关联的套餐、用户和支付记录
 *     tags: [订单管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 订单ID
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
 *                   example: "Order detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNo:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     packageId:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [purchase, renewal, upgrade]
 *                     status:
 *                       type: string
 *                       enum: [pending, paid, cancelled, refunded, expired]
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                     discount:
 *                       type: number
 *                       format: decimal
 *                       nullable: true
 *                     finalAmount:
 *                       type: number
 *                       format: decimal
 *                     currency:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     cancelledAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                     package:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                         type:
 *                           type: string
 *                         price:
 *                           type: number
 *                           nullable: true
 *                         duration:
 *                           type: integer
 *                           nullable: true
 *                         quota:
 *                           type: number
 *                           nullable: true
 *                     payments:
 *                       type: array
 *                       description: 该订单的所有支付记录（按创建时间倒序）
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           paymentNo:
 *                             type: string
 *                           paymentMethod:
 *                             type: string
 *                           paymentPlatform:
 *                             type: string
 *                           status:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           qrCodeUrl:
 *                             type: string
 *                             nullable: true
 *                           payUrl:
 *                             type: string
 *                             nullable: true
 *                           thirdPartyNo:
 *                             type: string
 *                             nullable: true
 *                           paidAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: 订单不存在或不属于当前用户
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 */
router.get(
  '/:id',
  authenticate,
  getOrderDetailValidator,
  validate,
  orderController.getOrderDetail
);

/**
 * @swagger
 * /api/user/orders/{id}/cancel:
 *   post:
 *     summary: 取消订单
 *     description: 取消指定订单，只有待支付状态的订单才能取消
 *     tags: [订单管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 订单ID
 *         example: "clx123456789"
 *     responses:
 *       200:
 *         description: 取消成功
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
 *                   example: "Order cancelled successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: 订单状态不允许取消（已支付、已取消等）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Order status is paid, cannot cancel"
 *       404:
 *         description: 订单不存在或不属于当前用户
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 */
router.post(
  '/:id/cancel',
  authenticate,
  cancelOrderValidator,
  validate,
  orderController.cancelOrder
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: 管理员查询订单列表
 *     description: 管理员查询所有订单列表，支持多条件筛选和分页
 *     tags: [订单管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled, refunded, expired]
 *         description: 订单状态筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [purchase, renewal, upgrade]
 *         description: 订单类型筛选
 *       - in: query
 *         name: orderNo
 *         schema:
 *           type: string
 *         description: 订单号（模糊搜索）
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选
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
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, paidAt]
 *           default: createdAt
 *         description: 排序字段
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序顺序
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
 *                   description: 订单列表（格式与用户订单列表相同，但包含所有用户的订单）
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       403:
 *         description: 权限不足（需要管理员权限）
 */
router.get(
  '/admin',
  authenticate,
  authorize('super_admin', 'platform_admin', 'finance', 'operator'),
  getOrdersValidator,
  validate,
  orderController.getOrders
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: 管理员查询订单详情
 *     description: 管理员查询指定订单的详细信息（不限制订单所属用户）
 *     tags: [订单管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 订单ID
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
 *                   example: "Order detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: 订单详情（格式与用户订单详情相同）
 *       403:
 *         description: 权限不足（需要管理员权限）
 *       404:
 *         description: 订单不存在
 */
router.get(
  '/admin/:id',
  authenticate,
  authorize('super_admin', 'platform_admin', 'finance', 'operator'),
  getOrderDetailValidator,
  validate,
  orderController.getAdminOrderDetail
);

module.exports = router;

