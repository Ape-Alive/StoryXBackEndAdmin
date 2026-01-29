const orderRepository = require('../repositories/order.repository');
const packageRepository = require('../repositories/package.repository');
const userPackageService = require('./userPackage.service');
const quotaService = require('./quota.service');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * 订单业务逻辑层
 */
class OrderService {
  /**
   * 创建订单
   */
  async createOrder(userId, packageId, type = 'purchase') {
    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 验证套餐是否存在且可用
    const pkg = await packageRepository.findById(packageId);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }
    if (!pkg.isActive) {
      throw new BadRequestError('Package is not available');
    }

    // 如果是付费套餐，必须走订单流程
    if (pkg.type === 'paid' && !pkg.price) {
      throw new BadRequestError('Paid package must have a price');
    }

    // 如果是免费套餐，可以直接创建 UserPackage，不需要订单
    if (pkg.type === 'free') {
      throw new BadRequestError('Free package does not require an order. Please use subscribePackage directly.');
    }

    // 计算订单金额
    let amount = parseFloat(pkg.price || 0);
    let discount = pkg.discount ? parseFloat(pkg.discount) : null;
    let finalAmount = amount;

    // 应用折扣
    if (discount && discount > 0 && discount <= 100) {
      finalAmount = amount * (1 - discount / 100);
    }

    // 设置订单过期时间（默认30分钟）
    const expireMinutes = parseInt(process.env.ORDER_EXPIRE_MINUTES || '30');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expireMinutes);

    // 生成订单描述
    const description = `购买套餐：${pkg.displayName || pkg.name}`;

    // 创建订单
    const order = await orderRepository.create({
      userId,
      packageId,
      type,
      amount,
      discount,
      finalAmount,
      description,
      expiresAt
    });

    return order;
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(orderId, userId = null) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 如果指定了 userId，验证订单属于该用户
    if (userId && order.userId !== userId) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  /**
   * 获取订单列表
   */
  async getOrders(filters = {}, pagination = {}, sort = {}) {
    return await orderRepository.findOrders(filters, pagination, sort);
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId, userId = null) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 如果指定了 userId，验证订单属于该用户
    if (userId && order.userId !== userId) {
      throw new NotFoundError('Order not found');
    }

    // 只能取消待支付订单
    if (order.status !== 'pending') {
      throw new BadRequestError(`Cannot cancel order with status: ${order.status}`);
    }

    // 更新订单状态
    await orderRepository.updateStatus(orderId, 'cancelled', {
      cancelledAt: new Date()
    });

    return { success: true };
  }

  /**
   * 完成订单（支付成功后调用）
   */
  async completeOrder(orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 订单必须已支付
    if (order.status !== 'paid') {
      throw new BadRequestError(`Order is not paid, current status: ${order.status}`);
    }

    // 使用事务确保数据一致性
    return await prisma.$transaction(async (tx) => {
      // 检查是否已经创建了 UserPackage（防止重复处理）
      const existingUserPackage = await tx.userPackage.findFirst({
        where: {
          userId: order.userId,
          packageId: order.packageId
        }
      });

      let userPackage;
      if (existingUserPackage) {
        // 如果套餐可叠加，延长有效期或增加额度
        const pkg = await tx.package.findUnique({
          where: { id: order.packageId }
        });

        if (pkg.isStackable) {
          // 延长有效期
          if (pkg.duration) {
            const newExpiresAt = existingUserPackage.expiresAt
              ? new Date(Math.max(new Date(existingUserPackage.expiresAt).getTime(), Date.now()))
              : new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + pkg.duration);

            userPackage = await tx.userPackage.update({
              where: { id: existingUserPackage.id },
              data: { expiresAt: newExpiresAt }
            });
          }

          // 增加额度
          if (pkg.quota) {
            await quotaService.adjustQuota(
              order.userId,
              order.packageId,
              parseFloat(pkg.quota),
              `Order completed: ${order.orderNo}`,
              null, // adminId
              null, // ipAddress
              order.id // orderId
            );
          }
        } else {
          // 不可叠加，直接返回现有套餐
          userPackage = existingUserPackage;
        }
      } else {
        // 创建新的 UserPackage
        let expiresAt = null;
        const pkg = await tx.package.findUnique({
          where: { id: order.packageId }
        });

        if (pkg.duration) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + pkg.duration);
        }

        userPackage = await tx.userPackage.create({
          data: {
            userId: order.userId,
            packageId: order.packageId,
            startedAt: new Date(),
            expiresAt,
            priority: pkg.priority || 0
          }
        });

        // 初始化用户额度
        if (pkg.quota) {
          const quotaAmount = parseFloat(pkg.quota);
          await quotaService.adjustQuota(
            order.userId,
            order.packageId,
            quotaAmount,
            `Order completed: ${order.orderNo}`,
            null, // adminId
            null, // ipAddress
            order.id // orderId
          );
        }
      }

      return {
        order,
        userPackage
      };
    });
  }

  /**
   * 处理过期订单（定时任务调用）
   */
  async expireOrders() {
    const expiredOrders = await orderRepository.findExpiredOrders();
    const results = [];

    for (const order of expiredOrders) {
      try {
        await orderRepository.updateStatus(order.id, 'expired');
        results.push({ orderId: order.id, status: 'expired' });
      } catch (error) {
        results.push({ orderId: order.id, status: 'error', error: error.message });
      }
    }

    return results;
  }
}

module.exports = new OrderService();

