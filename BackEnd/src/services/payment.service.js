const paymentRepository = require('../repositories/payment.repository');
const orderRepository = require('../repositories/order.repository');
const orderService = require('./order.service');
const PaymentFactory = require('./payment/payment.factory');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');
const prisma = require('../config/database');

/**
 * 支付业务逻辑层
 */
class PaymentService {
  /**
   * 创建支付
   */
  async createPayment(orderId, paymentMethod, extra = {}) {
    // 验证订单是否存在
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 订单必须是待支付状态
    if (order.status !== 'pending') {
      throw new BadRequestError(`Order status is ${order.status}, cannot create payment`);
    }

    // 检查是否已有支付记录
    const existingPayments = await paymentRepository.findByOrderId(orderId);
    const pendingPayment = existingPayments.find(p => p.status === 'pending');
    if (pendingPayment) {
      throw new BadRequestError('There is already a pending payment for this order');
    }

    // 根据支付方式确定支付平台
    const platformMap = {
      'wxpay_native': 'yungouos', // 微信扫码支付使用 YunGouOS
      'alipay': 'yungouos', // 支付宝使用 YunGouOS（如果支持）
      // 后续可以添加其他平台
      // 'wxpay_jsapi': 'wechat_official',
      // 'alipay_app': 'alipay_official',
      // 'stripe': 'stripe'
    };

    const paymentPlatform = platformMap[paymentMethod] || 'yungouos';

    // 创建支付提供者实例
    const provider = PaymentFactory.createProvider(paymentPlatform, {
      notifyUrl: extra.notifyUrl || `${process.env.API_BASE_URL || 'http://localhost:5800'}/api/payment/callback/${paymentPlatform}`
    });

    // 构建订单数据
    const orderData = {
      orderNo: order.orderNo,
      amount: order.finalAmount.toString(),
      description: order.description || `购买套餐：${order.package.displayName || order.package.name}`,
      notifyUrl: extra.notifyUrl || `${process.env.API_BASE_URL || 'http://localhost:5800'}/api/payment/callback/${paymentPlatform}`,
      returnUrl: extra.returnUrl,
      extra: {
        type: extra.type || '2', // 默认返回二维码图片地址
        attach: `orderId=${orderId}`,
        ...extra
      }
    };

    // 调用支付平台创建支付
    let paymentResult;
    try {
      paymentResult = await provider.createPayment(orderData);
    } catch (error) {
      logger.error('Payment provider create payment failed', {
        error: error.message,
        orderId,
        paymentMethod,
        platform: paymentPlatform
      });
      throw error;
    }

    // 创建支付记录
    const payment = await paymentRepository.create({
      orderId,
      paymentMethod,
      paymentPlatform,
      amount: order.finalAmount,
      currency: order.currency,
      qrCodeUrl: paymentResult.qrCodeUrl,
      payUrl: paymentResult.payUrl,
      thirdPartyNo: paymentResult.thirdPartyNo,
      notifyUrl: orderData.notifyUrl,
      callbackData: paymentResult.platformData
    });

    return payment;
  }

  /**
   * 获取支付详情
   */
  async getPaymentDetail(paymentId, userId = null) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // 如果指定了 userId，验证订单属于该用户
    if (userId && payment.order.userId !== userId) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(platform, callbackData) {
    logger.info('Payment callback received', { platform, callbackData });

    try {
      // 创建支付提供者实例
      const provider = PaymentFactory.createProvider(platform);

      // 解析回调数据
      const parsedData = provider.parseCallback(callbackData);
      const { orderNo, thirdPartyNo, status, amount, paidAt } = parsedData;

      // 根据订单号查找订单
      const order = await orderRepository.findByOrderNo(orderNo);
      if (!order) {
        logger.error('Order not found in callback', { orderNo, platform });
        throw new NotFoundError('Order not found');
      }

      // 查找支付记录
      const payments = await paymentRepository.findByOrderId(order.id);
      let payment = payments.find(p => p.paymentPlatform === platform) || payments[0];

      if (!payment) {
        logger.error('Payment not found in callback', { orderId: order.id, platform });
        throw new NotFoundError('Payment not found');
      }

      // 验证签名（必须验证，防止数据泄漏导致"假通知"）
      const sign = callbackData.sign || callbackData.signature;
      if (!sign) {
        logger.error('Payment callback missing signature', { orderNo, platform });
        throw new BadRequestError('Missing callback signature');
      }

      const isValid = await provider.verifyCallback(callbackData, sign);
      if (!isValid) {
        logger.error('Payment callback signature verification failed', {
          orderNo,
          platform,
          sign,
          callbackData
        });
        throw new BadRequestError('Invalid callback signature');
      }

      // 校验返回的订单金额是否与商户侧的订单金额一致（防止"假通知"）
      const callbackAmount = parseFloat(amount);
      const orderAmount = parseFloat(order.finalAmount);
      if (Math.abs(callbackAmount - orderAmount) > 0.01) {
        logger.error('Payment callback amount mismatch', {
          orderNo,
          callbackAmount,
          orderAmount,
          platform
        });
        throw new BadRequestError(`Payment amount mismatch: callback=${callbackAmount}, order=${orderAmount}`);
      }

      // 幂等性检查：如果支付已经成功，直接返回
      // 注意：在对业务数据进行状态检查和处理之前，要采用数据锁进行并发控制
      // 使用数据库行锁（SELECT ... FOR UPDATE）防止并发处理
      const lockedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: { id: true, status: true }
      });

      if (lockedPayment && lockedPayment.status === 'success') {
        logger.info('Payment already processed', { paymentId: payment.id, orderNo });
        return {
          success: true,
          message: 'Payment already processed',
          orderId: order.id,
          paymentId: payment.id
        };
      }

      // 使用事务处理支付成功逻辑（事务本身提供并发控制）
      // 使用 SELECT ... FOR UPDATE 锁定支付记录，防止并发处理
      return await prisma.$transaction(async (tx) => {
        // 重新查询并锁定支付记录（防止并发）
        const lockedPayment = await tx.payment.findUnique({
          where: { id: payment.id }
        });

        if (!lockedPayment) {
          throw new NotFoundError('Payment not found');
        }

        // 再次检查状态（双重检查，防止并发）
        if (lockedPayment.status === 'success') {
          logger.info('Payment already processed (in transaction)', { paymentId: lockedPayment.id, orderNo });
          return {
            success: true,
            message: 'Payment already processed',
            orderId: order.id,
            paymentId: lockedPayment.id
          };
        }

        // 更新支付状态（使用锁定的支付记录）
        await tx.payment.update({
          where: { id: lockedPayment.id },
          data: {
            status: status === 'success' ? 'success' : 'failed',
            thirdPartyNo: thirdPartyNo || lockedPayment.thirdPartyNo,
            paidAt: status === 'success' ? (paidAt ? new Date(paidAt) : new Date()) : null,
            failedAt: status !== 'success' ? new Date() : null,
            failureReason: status !== 'success' ? 'Payment failed' : null,
            callbackData: JSON.stringify(callbackData),
            updatedAt: new Date()
          }
        });

        // 如果支付成功，更新订单状态并完成订单
        if (status === 'success') {
          // 更新订单状态
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'paid',
              paidAt: paidAt ? new Date(paidAt) : new Date(),
              updatedAt: new Date()
            }
          });

          // 完成订单（创建 UserPackage 和增加额度）
          await orderService.completeOrder(order.id);
        }

        return {
          success: status === 'success',
          message: status === 'success' ? 'Payment processed successfully' : 'Payment failed',
          orderId: order.id,
          paymentId: lockedPayment.id
        };
      });
    } catch (error) {
      logger.error('Payment callback processing error', {
        error: error.message,
        stack: error.stack,
        platform,
        callbackData
      });
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(paymentId, userId = null) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // 如果指定了 userId，验证订单属于该用户
    if (userId && payment.order.userId !== userId) {
      throw new NotFoundError('Payment not found');
    }

    // 如果支付已经成功或失败，直接返回
    if (payment.status === 'success' || payment.status === 'failed') {
      return payment;
    }

    // 如果支付平台支持主动查询，调用查询接口
    try {
      const provider = PaymentFactory.createProvider(payment.paymentPlatform);
      if (payment.thirdPartyNo) {
        const statusResult = await provider.queryPaymentStatus(payment.thirdPartyNo);

        // 更新支付状态
        if (statusResult.status !== payment.status) {
          await paymentRepository.updateStatus(payment.id, statusResult.status, {
            paidAt: statusResult.status === 'success' ? (statusResult.paidAt ? new Date(statusResult.paidAt) : new Date()) : null
          });

          // 如果支付成功，更新订单状态
          if (statusResult.status === 'success' && payment.order.status === 'pending') {
            await orderRepository.updateStatus(payment.orderId, 'paid', {
              paidAt: statusResult.paidAt ? new Date(statusResult.paidAt) : new Date()
            });
            await orderService.completeOrder(payment.orderId);
          }
        }

        return await paymentRepository.findById(paymentId);
      }
    } catch (error) {
      // 如果平台不支持查询，返回当前状态
      logger.warn('Payment status query not supported or failed', {
        paymentId,
        platform: payment.paymentPlatform,
        error: error.message
      });
    }

    return payment;
  }
}

module.exports = new PaymentService();

