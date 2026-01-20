const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

/**
 * 用户数据访问层
 */
class UserRepository {
  /**
   * 获取用户列表（分页）
   */
  async findUsers(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where = {};

    if (filters.id) {
      where.id = filters.id;
    }

    if (filters.email) {
      where.email = { contains: filters.email };
    }

    if (filters.phone) {
      where.phone = { contains: filters.phone };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) {
        where.createdAt.gte = new Date(filters.createdAt.gte);
      }
      if (filters.createdAt.lte) {
        where.createdAt.lte = new Date(filters.createdAt.lte);
      }
    }

    // 构建排序
    const orderBy = {};
    if (sort.createdAt) {
      orderBy.createdAt = sort.createdAt;
    } else if (sort.lastLoginAt) {
      orderBy.lastLoginAt = sort.lastLoginAt;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          packages: {
            include: {
              package: true
            },
            take: 1,
            orderBy: {
              priority: 'desc'
            }
          },
          _count: {
            select: {
              devices: true,
              quotaRecords: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // 格式化数据
    const formattedData = data.map(user => ({
      ...user,
      currentPackage: user.packages[0]?.package || null,
      deviceCount: user._count.devices,
      quotaRecordCount: user._count.quotaRecords
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取用户
   */
  async findById(userId) {
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  }

  /**
   * 根据邮箱获取用户
   */
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * 根据手机号获取用户
   */
  async findByPhone(phone) {
    return await prisma.user.findUnique({
      where: { phone }
    });
  }

  /**
   * 更新用户状态
   */
  async updateStatus(userId, status, reason = null, banUntil = null) {
    const updateData = {
      status,
      banReason: reason || null,
      banUntil: banUntil || null,
      updatedAt: new Date()
    };

    return await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  /**
   * 获取用户详情（包含关联数据）
   */
  async findUserDetail(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        packages: {
          include: {
            package: true
          },
          orderBy: {
            priority: 'desc'
          }
        },
        devices: {
          orderBy: {
            lastUsedAt: 'desc'
          },
          take: 10
        },
        quotas: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * 获取用户设备列表
   */
  async findUserDevices(userId, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.device.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: {
          lastUsedAt: 'desc'
        }
      }),
      prisma.device.count({ where: { userId } })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 解绑用户设备
   */
  async unbindDevice(userId, deviceId) {
    // 验证设备属于该用户
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId: userId
      }
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    return await prisma.device.delete({
      where: { id: deviceId }
    });
  }

  /**
   * 批量解绑设备
   */
  async unbindDevices(userId, deviceIds) {
    return await prisma.device.deleteMany({
      where: {
        id: { in: deviceIds },
        userId: userId
      }
    });
  }

  /**
   * 批量导出用户数据
   */
  async exportUsers(filters = {}) {
    const where = {};

    if (filters.id) {
      where.id = filters.id;
    }

    if (filters.email) {
      where.email = { contains: filters.email };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) {
        where.createdAt.gte = new Date(filters.createdAt.gte);
      }
      if (filters.createdAt.lte) {
        where.createdAt.lte = new Date(filters.createdAt.lte);
      }
    }

    return await prisma.user.findMany({
      where,
      include: {
        packages: {
          include: {
            package: true
          }
        },
        _count: {
          select: {
            devices: true
          }
        }
      }
    });
  }

  /**
   * 获取用户使用统计
   */
  async getUserStatistics(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取调用次数统计
    const callStats = await prisma.aICallLog.groupBy({
      by: ['status'],
      where: {
        userId,
        requestTime: {
          gte: startDate
        }
      },
      _count: true
    });

    // 获取Token消耗统计
    const tokenStats = await prisma.aICallLog.aggregate({
      where: {
        userId,
        requestTime: {
          gte: startDate
        },
        status: 'success'
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        cost: true
      }
    });

    // 获取模型使用分布
    const modelDistribution = await prisma.aICallLog.groupBy({
      by: ['modelId'],
      where: {
        userId,
        requestTime: {
          gte: startDate
        }
      },
      _count: true,
      _sum: {
        totalTokens: true,
        cost: true
      }
    });

    // 获取Token消耗趋势（按天）
    const dailyStats = await prisma.$queryRaw`
      SELECT
        DATE(requestTime) as date,
        SUM(totalTokens) as totalTokens,
        SUM(cost) as cost,
        COUNT(*) as callCount
      FROM ai_call_logs
      WHERE userId = ${userId}
        AND requestTime >= ${startDate}
        AND status = 'success'
      GROUP BY DATE(requestTime)
      ORDER BY date ASC
    `;

    return {
      callStats,
      tokenStats: {
        totalInputTokens: tokenStats._sum.inputTokens || 0,
        totalOutputTokens: tokenStats._sum.outputTokens || 0,
        totalTokens: tokenStats._sum.totalTokens || 0,
        totalCost: tokenStats._sum.cost || 0
      },
      modelDistribution,
      dailyStats
    };
  }
}

module.exports = new UserRepository();