const prisma = require('../config/database');

/**
 * 支付数据访问层
 */
class PaymentRepository {
  /**
   * 生成支付单号
   * @returns {String} 支付单号（格式：PAY + 时间戳 + 随机数）
   */
  generatePaymentNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY${timestamp}${random}`;
  }

  /**
   * 创建支付记录
   */
  async create(data) {
    const paymentNo = data.paymentNo || this.generatePaymentNo();

    return await prisma.payment.create({
      data: {
        paymentNo,
        orderId: data.orderId,
        thirdPartyNo: data.thirdPartyNo,
        paymentMethod: data.paymentMethod,
        paymentPlatform: data.paymentPlatform,
        amount: data.amount,
        currency: data.currency || 'CNY',
        status: data.status || 'pending',
        qrCodeUrl: data.qrCodeUrl,
        payUrl: data.payUrl,
        notifyUrl: data.notifyUrl,
        callbackData: data.callbackData ? JSON.stringify(data.callbackData) : null
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true
              }
            },
            package: true
          }
        }
      }
    });
  }

  /**
   * 根据ID查询支付记录
   */
  async findById(id) {
    return await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true
              }
            },
            package: true
          }
        }
      }
    });
  }

  /**
   * 根据支付单号查询
   */
  async findByPaymentNo(paymentNo) {
    return await prisma.payment.findUnique({
      where: { paymentNo },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true
              }
            },
            package: true
          }
        }
      }
    });
  }

  /**
   * 根据订单ID查询支付记录
   */
  async findByOrderId(orderId) {
    return await prisma.payment.findMany({
      where: { orderId },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true
              }
            },
            package: true
          }
        }
      }
    });
  }

  /**
   * 根据第三方交易号查询
   */
  async findByThirdPartyNo(thirdPartyNo) {
    return await prisma.payment.findFirst({
      where: { thirdPartyNo },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true
              }
            },
            package: true
          }
        }
      }
    });
  }

  /**
   * 更新支付记录
   */
  async update(id, data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    if (data.callbackData) {
      updateData.callbackData = JSON.stringify(data.callbackData);
    }

    return await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true
              }
            },
            package: true
          }
        }
      }
    });
  }

  /**
   * 更新支付状态
   */
  async updateStatus(id, status, additionalData = {}) {
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'success' && !additionalData.paidAt) {
      updateData.paidAt = new Date();
    } else if (status === 'failed' && !additionalData.failedAt) {
      updateData.failedAt = new Date();
    }

    Object.assign(updateData, additionalData);

    return await prisma.payment.update({
      where: { id },
      data: updateData
    });
  }
}

module.exports = new PaymentRepository();

