const prisma = require('../config/database');

/**
 * 额度流水数据访问层
 */
class QuotaRecordRepository {
  /**
   * 获取额度流水列表
   */
  async findRecords(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.requestId) {
      where.requestId = filters.requestId;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
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

    const orderBy = {
      createdAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.quotaRecord.findMany({
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
              displayName: true
            }
          }
        }
      }),
      prisma.quotaRecord.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 requestId 查询流水
   */
  async findByRequestId(requestId) {
    return await prisma.quotaRecord.findMany({
      where: { requestId },
      include: {
        user: true,
        package: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  /**
   * 创建额度流水记录
   */
  async create(data) {
    return await prisma.quotaRecord.create({
      data: {
        userId: data.userId,
        packageId: data.packageId || null,
        orderId: data.orderId || null,
        type: data.type,
        amount: data.amount,
        before: data.before,
        after: data.after,
        reason: data.reason || null,
        requestId: data.requestId || null
      }
    });
  }

  /**
   * 根据ID查询单条记录
   */
  async findById(id) {
    return await prisma.quotaRecord.findUnique({
      where: { id },
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
            displayName: true
          }
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true
          }
        }
      }
    });
  }

  /**
   * 根据ID数组批量查询
   */
  async findByIds(ids) {
    return await prisma.quotaRecord.findMany({
      where: {
        id: {
          in: ids
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true
          }
        }
      }
    });
  }

  /**
   * 删除单条记录
   */
  async delete(id) {
    return await prisma.quotaRecord.delete({
      where: { id }
    });
  }

  /**
   * 批量删除记录
   */
  async batchDelete(ids) {
    const result = await prisma.quotaRecord.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });
    return result.count;
  }

  /**
   * 批量导出流水
   */
  async exportRecords(filters = {}) {
    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
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

    return await prisma.quotaRecord.findMany({
      where,
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
            displayName: true
          }
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * 获取使用趋势统计（按时间段）
   * @param {Object} filters - 筛选条件
   * @param {string} filters.userId - 用户ID（可选）
   * @param {string} filters.packageId - 套餐ID（可选）
   * @param {Date} filters.startDate - 开始时间
   * @param {Date} filters.endDate - 结束时间
   * @param {string} filters.period - 时间段类型：day, week, month
   * @returns {Promise<Array>} 时间段统计数据
   */
  async getUsageTrend(filters = {}) {
    const where = {
      type: 'decrease' // 只统计使用（减少）的记录
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
    }

    const period = filters.period || 'day';

    // 获取所有符合条件的记录
    const records = await prisma.quotaRecord.findMany({
      where,
      select: {
        createdAt: true,
        amount: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 按时间段分组统计
    const grouped = {};
    records.forEach(record => {
      const date = new Date(record.createdAt);
      let key = '';

      if (period === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'week') {
        const week = QuotaRecordRepository.getWeekNumber(date);
        key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
      } else if (period === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          totalAmount: 0,
          totalCount: 0
        };
      }
      grouped[key].totalAmount += parseFloat(record.amount || 0);
      grouped[key].totalCount += 1;
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 获取周数（静态方法）
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * 获取套餐使用排行
   * @param {Object} filters - 筛选条件
   * @param {Date} filters.startDate - 开始时间
   * @param {Date} filters.endDate - 结束时间
   * @param {number} filters.limit - 返回数量限制
   * @returns {Promise<Array>} 套餐使用排行
   */
  async getPackageRanking(filters = {}) {
    const where = {
      type: 'decrease',
      packageId: { not: null } // 只统计有套餐的记录
    };

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
    }

    const limit = filters.limit || 10;

    // 按套餐分组统计
    const records = await prisma.quotaRecord.groupBy({
      by: ['packageId'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // 获取套餐信息
    const packageIds = records.map(r => r.packageId).filter(Boolean);
    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: {
        id: true,
        name: true,
        displayName: true
      }
    });

    const packageMap = {};
    packages.forEach(pkg => {
      packageMap[pkg.id] = pkg;
    });

    // 组装结果
    const ranking = records
      .map(record => ({
        packageId: record.packageId,
        package: packageMap[record.packageId] || null,
        totalAmount: parseFloat(record._sum.amount || 0),
        totalCount: record._count.id
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    return ranking;
  }

  /**
   * 获取用户使用排行
   * @param {Object} filters - 筛选条件
   * @param {Date} filters.startDate - 开始时间
   * @param {Date} filters.endDate - 结束时间
   * @param {number} filters.limit - 返回数量限制
   * @returns {Promise<Array>} 用户使用排行
   */
  async getUserRanking(filters = {}) {
    const where = {
      type: 'decrease'
    };

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
    }

    const limit = filters.limit || 10;

    // 按用户分组统计
    const records = await prisma.quotaRecord.groupBy({
      by: ['userId'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // 获取用户信息
    const userIds = records.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        phone: true
      }
    });

    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // 组装结果
    const ranking = records
      .map(record => ({
        userId: record.userId,
        user: userMap[record.userId] || null,
        totalAmount: parseFloat(record._sum.amount || 0),
        totalCount: record._count.id
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    return ranking;
  }

  /**
   * 获取使用分布统计（按类型、时间段等）
   * @param {Object} filters - 筛选条件
   * @param {Date} filters.startDate - 开始时间
   * @param {Date} filters.endDate - 结束时间
   * @returns {Promise<Object>} 使用分布统计
   */
  async getUsageDistribution(filters = {}) {
    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
    }

    // 按类型统计
    const typeStats = await prisma.quotaRecord.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // 按时间段统计（今天、本周、本月、本年）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [todayStats, weekStats, monthStats, yearStats] = await Promise.all([
      prisma.quotaRecord.aggregate({
        where: { ...where, createdAt: { gte: todayStart }, type: 'decrease' },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.quotaRecord.aggregate({
        where: { ...where, createdAt: { gte: weekStart }, type: 'decrease' },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.quotaRecord.aggregate({
        where: { ...where, createdAt: { gte: monthStart }, type: 'decrease' },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.quotaRecord.aggregate({
        where: { ...where, createdAt: { gte: yearStart }, type: 'decrease' },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    return {
      byType: typeStats.map(stat => ({
        type: stat.type,
        totalAmount: parseFloat(stat._sum.amount || 0),
        totalCount: stat._count.id
      })),
      byPeriod: {
        today: {
          totalAmount: parseFloat(todayStats._sum.amount || 0),
          totalCount: todayStats._count.id
        },
        week: {
          totalAmount: parseFloat(weekStats._sum.amount || 0),
          totalCount: weekStats._count.id
        },
        month: {
          totalAmount: parseFloat(monthStats._sum.amount || 0),
          totalCount: monthStats._count.id
        },
        year: {
          totalAmount: parseFloat(yearStats._sum.amount || 0),
          totalCount: yearStats._count.id
        }
      }
    };
  }

  /**
   * 获取用户详细使用统计
   * @param {string} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @param {Date} filters.startDate - 开始时间
   * @param {Date} filters.endDate - 结束时间
   * @returns {Promise<Object>} 用户详细使用统计
   */
  async getUserUsageStatistics(userId, filters = {}) {
    const where = {
      userId,
      type: 'decrease'
    };

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
    }

    // 总体统计
    const totalStats = await prisma.quotaRecord.aggregate({
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // 按套餐统计
    const packageStats = await prisma.quotaRecord.groupBy({
      by: ['packageId'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // 获取套餐信息
    const packageIds = packageStats.map(s => s.packageId).filter(Boolean);
    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: {
        id: true,
        name: true,
        displayName: true
      }
    });

    const packageMap = {};
    packages.forEach(pkg => {
      packageMap[pkg.id] = pkg;
    });

    // 按日期统计（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyStats = await prisma.quotaRecord.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: {
        amount: true
      }
    });

    const dailyData = {};
    dailyStats.forEach(stat => {
      const date = new Date(stat.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = 0;
      }
      dailyData[date] += parseFloat(stat._sum.amount || 0);
    });

    return {
      total: {
        totalAmount: parseFloat(totalStats._sum.amount || 0),
        totalCount: totalStats._count.id
      },
      byPackage: packageStats.map(stat => ({
        packageId: stat.packageId,
        package: packageMap[stat.packageId] || null,
        totalAmount: parseFloat(stat._sum.amount || 0),
        totalCount: stat._count.id
      })),
      dailyUsage: Object.entries(dailyData)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}

module.exports = new QuotaRecordRepository();
