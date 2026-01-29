const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const { handleCallbackValidator } = require('../validators/payment.validator');

/**
 * @swagger
 * tags:
 *   name: 支付回调
 *   description: 支付回调接口（公开接口，不需要认证）
 */

/**
 * @swagger
 * /api/payment/callback/{platform}:
 *   post:
 *     summary: 支付回调接口（公开接口，不需要认证）
 *     description: |
 *       支付平台异步回调接口，用于接收支付结果通知。
 *       注意：
 *       1. 此接口为公开接口，不需要认证
 *       2. YunGouOS 平台要求返回纯文本 "SUCCESS" 或 "FAIL"（大写，区分大小写）
 *       3. 其他平台返回 JSON 格式
 *       4. 回调数据可能是 JSON 或 form-urlencoded 格式
 *       5. 系统会自动验证签名、校验金额、处理幂等性
 *     tags: [支付回调]
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [yungouos, wechat_official, alipay_official, stripe]
 *         description: 支付平台名称
 *         example: "yungouos"
 *     requestBody:
 *       required: true
 *       description: 支付平台回调的原始数据（格式由支付平台决定）
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: JSON 格式回调数据（部分平台使用）
 *             example:
 *               code: "1"
 *               orderNo: "YUNGOUS_ORDER_123"
 *               outTradeNo: "ORDER17040672000001234"
 *               payNo: "WX_PAY_NO_123456"
 *               money: "99.00"
 *               mchId: "1234567890"
 *               payChannel: "wxpay"
 *               time: "2024-01-28 10:05:00"
 *               sign: "ABCD1234EFGH5678IJKL9012MNOP3456"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             description: form-urlencoded 格式回调数据（YunGouOS 使用）
 *             example:
 *               code: "1"
 *               outTradeNo: "ORDER17040672000001234"
 *               payNo: "WX_PAY_NO_123456"
 *               money: "99.00"
 *               sign: "ABCD1234EFGH5678IJKL9012MNOP3456"
 *     responses:
 *       200:
 *         description: 回调处理成功
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: YunGouOS 平台返回纯文本（SUCCESS 或 FAIL）
 *               example: "SUCCESS"
 *           application/json:
 *             schema:
 *               type: object
 *               description: 其他平台返回 JSON 格式
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Callback processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       description: 支付是否成功
 *                     message:
 *                       type: string
 *                       description: 处理结果消息
 *                     orderId:
 *                       type: string
 *                       description: 订单ID
 *                     paymentId:
 *                       type: string
 *                       description: 支付记录ID
 *       400:
 *         description: 回调数据验证失败（签名错误、金额不匹配等）
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "FAIL"
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid callback signature"
 */
router.post(
  '/:platform',
  handleCallbackValidator,
  validate,
  paymentController.handleCallback
);

module.exports = router;

