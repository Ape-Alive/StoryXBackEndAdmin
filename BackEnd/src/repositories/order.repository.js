const prisma = require('../config/database');

/**
 * 订单数据访问层
 */
class OrderRepository {
  /**
   * 生成订单号
   * @returns {String} 订单号（格式：ORDER + 时间戳 + 随机数）
   */
  generateOrderNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORDER${timestamp}${random}`;
  }

  /**
   * 创建订单
   */
  async create(data) {
    const orderNo = data.orderNo || this.generateOrderNo();

    return await prisma.order.create({
      data: {
        orderNo,
        userId: data.userId,
        packageId: data.packageId,
        type: data.type || 'purchase',
        status: data.status || 'pending',
        amount: data.amount,
        currency: data.currency || 'CNY',
        discount: data.discount,
        finalAmount: data.finalAmount || data.amount,
        description: data.description,
        expiresAt: data.expiresAt
      },
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
    });
  }

  /**
   * 根据ID查询订单
   */
  async findById(id) {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true
          }
        },
        package: true,
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  /**
   * 根据订单号查询订单
   */
  async findByOrderNo(orderNo) {
    return await prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true
          }
        },
        package: true,
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  /**
   * 查询订单列表
   */
  async findOrders(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.orderNo) where.orderNo = { contains: filters.orderNo };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.packageId) where.packageId = filters.packageId;
    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) where.createdAt.gte = new Date(filters.createdAt.gte);
      if (filters.createdAt.lte) where.createdAt.lte = new Date(filters.createdAt.lte);
    }

    const orderBy = {};
    if (sort.orderBy) {
      orderBy[sort.orderBy] = sort.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              displayName: true,
              type: true
            }
          },
          payments: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 更新订单
   */
  async update(id, data) {
    return await prisma.order.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
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
    });
  }

  /**
   * 更新订单状态
   */
  async updateStatus(id, status, additionalData = {}) {
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'paid' && !additionalData.paidAt) {
      updateData.paidAt = new Date();
    } else if (status === 'cancelled' && !additionalData.cancelledAt) {
      updateData.cancelledAt = new Date();
    }

    Object.assign(updateData, additionalData);

    return await prisma.order.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * 查询过期订单
   */
  async findExpiredOrders() {
    const now = new Date();
    return await prisma.order.findMany({
      where: {
        status: 'pending',
        expiresAt: {
          lte: now
        }
      }
    });
  }
}

module.exports = new OrderRepository();

