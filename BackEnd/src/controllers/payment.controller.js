const paymentService = require('../services/payment.service');
const ResponseHandler = require('../utils/response');

/**
 * 支付控制器
 */
class PaymentController {
  /**
   * 发起支付
   */
  async createPayment(req, res, next) {
    try {
      const { orderId } = req.params;
      const { paymentMethod, ...extra } = req.body;
      const userId = req.user.id;

      if (!paymentMethod) {
        return ResponseHandler.error(res, 'Payment method is required', 400);
      }

      const payment = await paymentService.createPayment(orderId, paymentMethod, extra);
      return ResponseHandler.success(res, payment, 'Payment created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取支付详情
   */
  async getPaymentDetail(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const payment = await paymentService.getPaymentDetail(id, userId);
      return ResponseHandler.success(res, payment, 'Payment detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 支付回调（公开接口，不需要认证）
   * 注意：YunGouOS 可能使用 form-urlencoded 格式发送回调数据
   */
  async handleCallback(req, res, next) {
    try {
      const { platform } = req.params;

      // 获取回调数据（可能是 JSON 或 form-urlencoded）
      let callbackData = req.body;

      // 如果是 form-urlencoded，数据已经在 req.body 中
      // 如果是 JSON，也在 req.body 中
      // 确保 callbackData 是对象格式
      if (typeof callbackData !== 'object' || callbackData === null) {
        callbackData = {};
      }

      const result = await paymentService.handlePaymentCallback(platform, callbackData);

      // 根据平台返回不同的响应格式
      if (platform === 'yungouos') {
        // YunGouOS 要求返回大写的 SUCCESS 或 FAIL（纯文本，区分大小写）
        // 文档明确说明：返回 SUCCESS 区分大小写，必须为大写
        return res.send(result.success ? 'SUCCESS' : 'FAIL');
      }

      // 其他平台返回 JSON
      return ResponseHandler.success(res, result, 'Callback processed successfully');
    } catch (error) {
      // 即使处理失败，也要返回适当的响应给支付平台
      // 注意：YunGouOS 要求返回大写的 SUCCESS 或 FAIL
      const { platform } = req.params;
      if (platform === 'yungouos') {
        // 记录错误日志
        const logger = require('../utils/logger');
        logger.error('Payment callback processing failed', {
          error: error.message,
          stack: error.stack,
          platform,
          callbackData: req.body
        });
        return res.send('FAIL');
      }
      next(error);
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const payment = await paymentService.queryPaymentStatus(id, userId);
      return ResponseHandler.success(res, payment, 'Payment status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();

