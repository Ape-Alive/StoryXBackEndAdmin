const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  createPaymentValidator,
  getPaymentDetailValidator,
  queryPaymentStatusValidator,
  handleCallbackValidator
} = require('../validators/payment.validator');

/**
 * @swagger
 * tags:
 *   name: 支付管理
 *   description: 支付相关接口
 */

/**
 * @swagger
 * /api/user/orders/{orderId}/payment:
 *   post:
 *     summary: 发起支付 [仅终端用户]
 *     description: 为指定订单创建支付记录，返回支付二维码或支付链接（只能为自己的订单发起支付）
 *     tags: [支付管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: 订单ID
 *         example: "clx123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [wxpay_native, alipay]
 *                 description: 支付方式（wxpay_native=微信扫码支付，alipay=支付宝）
 *                 example: "wxpay_native"
 *               type:
 *                 type: string
 *                 enum: ['1', '2']
 *                 default: '2'
 *                 description: 返回类型（1=支付链接，2=二维码图片地址）
 *                 example: "2"
 *               notifyUrl:
 *                 type: string
 *                 format: url
 *                 description: 自定义回调地址（可选，默认使用系统配置）
 *               returnUrl:
 *                 type: string
 *                 format: url
 *                 description: 支付完成后的跳转地址（可选）
 *     responses:
 *       201:
 *         description: 支付创建成功
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
 *                   example: "Payment created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 支付记录ID
 *                       example: "clx987654321"
 *                     paymentNo:
 *                       type: string
 *                       description: 支付单号
 *                       example: "PAY17040672000001234"
 *                     orderId:
 *                       type: string
 *                       description: 订单ID
 *                       example: "clx123456789"
 *                     paymentMethod:
 *                       type: string
 *                       description: 支付方式
 *                       example: "wxpay_native"
 *                     paymentPlatform:
 *                       type: string
 *                       description: 支付平台
 *                       example: "yungouos"
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                       description: 支付金额（元）
 *                       example: 99.00
 *                     currency:
 *                       type: string
 *                       description: 货币单位
 *                       example: "CNY"
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed, refunded]
 *                       description: 支付状态（pending=待支付，success=支付成功，failed=支付失败，refunded=已退款）
 *                       example: "pending"
 *                     qrCodeUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: 二维码图片地址（type='2'时返回）
 *                       example: "http://images.yungouos.com/wxpay/native/code/1556529600703.png"
 *                     payUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: 支付链接（type='1'时返回）
 *                       example: null
 *                     thirdPartyNo:
 *                       type: string
 *                       nullable: true
 *                       description: 第三方支付平台交易号（支付成功后才有）
 *                       example: null
 *                     notifyUrl:
 *                       type: string
 *                       format: uri
 *                       description: 回调通知地址
 *                       example: "http://localhost:5800/api/payment/callback/yungouos"
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
 *                     order:
 *                       type: object
 *                       description: 关联的订单信息
 *                       properties:
 *                         id:
 *                           type: string
 *                         orderNo:
 *                           type: string
 *                         status:
 *                           type: string
 *                         amount:
 *                           type: number
 *       400:
 *         description: 请求参数错误或订单状态不正确
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
 *                   example: "Order status is paid, cannot create payment"
 *       404:
 *         description: 订单不存在
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
  '/orders/:orderId/payment',
  authenticate,
  createPaymentValidator,
  validate,
  paymentController.createPayment
);

/**
 * @swagger
 * /api/user/payments/{id}:
 *   get:
 *     summary: 获取支付详情 [仅终端用户]
 *     description: 查询指定支付记录的详细信息，包括订单信息（只能查看自己的支付记录）
 *     tags: [支付管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 支付记录ID
 *         example: "clx987654321"
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
 *                   example: "Payment detail retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clx987654321"
 *                     paymentNo:
 *                       type: string
 *                       example: "PAY17040672000001234"
 *                     orderId:
 *                       type: string
 *                       example: "clx123456789"
 *                     paymentMethod:
 *                       type: string
 *                       example: "wxpay_native"
 *                     paymentPlatform:
 *                       type: string
 *                       example: "yungouos"
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                       example: 99.00
 *                     currency:
 *                       type: string
 *                       example: "CNY"
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed, refunded]
 *                       example: "pending"
 *                     qrCodeUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "http://images.yungouos.com/wxpay/native/code/1556529600703.png"
 *                     payUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: null
 *                     thirdPartyNo:
 *                       type: string
 *                       nullable: true
 *                       example: "WX_PAY_NO_123456"
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 支付成功时间
 *                       example: "2024-01-28T10:05:00.000Z"
 *                     failedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: 支付失败时间
 *                       example: null
 *                     failureReason:
 *                       type: string
 *                       nullable: true
 *                       description: 支付失败原因
 *                       example: null
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-28T10:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-28T10:05:00.000Z"
 *                     order:
 *                       type: object
 *                       description: 关联的订单信息
 *                       properties:
 *                         id:
 *                           type: string
 *                         orderNo:
 *                           type: string
 *                         status:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         finalAmount:
 *                           type: number
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             email:
 *                               type: string
 *                         package:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             displayName:
 *                               type: string
 *       404:
 *         description: 支付记录不存在或不属于当前用户
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
 *                   example: "Payment not found"
 */
router.get(
  '/payments/:id',
  authenticate,
  getPaymentDetailValidator,
  validate,
  paymentController.getPaymentDetail
);

/**
 * @swagger
 * /api/user/payments/{id}/query:
 *   post:
 *     summary: 查询支付状态 [仅终端用户]
 *     description: 主动查询支付状态，如果支付平台支持查询接口，会同步最新状态（只能查询自己的支付记录）
 *     tags: [支付管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 支付记录ID
 *         example: "clx987654321"
 *     responses:
 *       200:
 *         description: 查询成功
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
 *                   example: "Payment status retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: 支付记录信息（格式与获取支付详情接口相同）
 *                   properties:
 *                     id:
 *                       type: string
 *                     paymentNo:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed, refunded]
 *                       description: 支付状态（可能已更新为最新状态）
 *                     thirdPartyNo:
 *                       type: string
 *                       nullable: true
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       404:
 *         description: 支付记录不存在或不属于当前用户
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
 *                   example: "Payment not found"
 */
router.post(
  '/payments/:id/query',
  authenticate,
  queryPaymentStatusValidator,
  validate,
  paymentController.queryPaymentStatus
);

module.exports = router;

