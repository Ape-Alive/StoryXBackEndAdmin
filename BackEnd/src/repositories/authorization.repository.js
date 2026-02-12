const prisma = require('../config/database');

/**
 * 授权数据访问层
 */
class AuthorizationRepository {
  /**
   * 获取授权记录列表
   */
  async findAuthorizations(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.modelId) {
      where.modelId = filters.modelId;
    }

    if (filters.callToken) {
      where.callToken = filters.callToken;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.requestId) {
      where.requestId = filters.requestId;
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

    // 筛选未过期的授权
    if (filters.activeOnly) {
      where.status = 'active';
      where.expiresAt = { gt: new Date() };
    }

    const orderBy = {
      createdAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.authorization.findMany({
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
          model: {
            include: {
              provider: true
            }
          }
        }
      }),
      prisma.authorization.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取授权记录
   */
  async findById(id) {
    return await prisma.authorization.findUnique({
      where: { id },
      include: {
        user: true,
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  }

  /**
   * 根据 callToken 获取授权记录
   */
  async findByCallToken(callToken) {
    return await prisma.authorization.findUnique({
      where: { callToken },
      include: {
        user: true,
        model: {
          include: {
            provider: true,
            prices: true
          }
        }
      }
    });
  }

  /**
   * 撤销授权
   */
  async revoke(id) {
    return await prisma.authorization.update({
      where: { id },
      data: {
        status: 'revoked',
        updatedAt: new Date()
      }
    });
  }

  /**
   * 批量撤销用户的所有授权
   */
  async revokeByUser(userId) {
    return await prisma.authorization.updateMany({
      where: {
        userId,
        status: 'active'
      },
      data: {
        status: 'revoked',
        updatedAt: new Date()
      }
    });
  }

  /**
   * 创建授权记录
   */
  async create(data) {
    return await prisma.authorization.create({
      data: {
        userId: data.userId,
        modelId: data.modelId,
        deviceFingerprint: data.deviceFingerprint,
        ipAddress: data.ipAddress,
        frozenQuota: data.frozenQuota,
        callToken: data.callToken,
        status: data.status || 'active',
        expiresAt: data.expiresAt
      },
      include: {
        user: true,
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  }

  /**
   * 更新授权状态
   */
  async updateStatus(id, status) {
    return await prisma.authorization.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 获取用户授权统计
   */
  async getUserAuthorizationStats(userId) {
    // 按状态分组统计
    const statusStats = await prisma.authorization.groupBy({
      by: ['status'],
      where: {
        userId
      },
      _count: true
    });

    // 总授权数量
    const total = await prisma.authorization.count({
      where: { userId }
    });

    // 最近7天的授权数量
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysCount = await prisma.authorization.count({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    // 最近30天的授权数量
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DaysCount = await prisma.authorization.count({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // 当前活跃授权数量（未过期且状态为active）
    const now = new Date();
    const activeCount = await prisma.authorization.count({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gt: now
        }
      }
    });

    // 当前冻结的额度总和（活跃授权）
    const activeAuthorizations = await prisma.authorization.findMany({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gt: now
        }
      },
      select: {
        frozenQuota: true
      }
    });

    const totalFrozenQuota = activeAuthorizations.reduce((sum, auth) => {
      return sum + parseFloat(auth.frozenQuota || 0);
    }, 0);

    // 按模型分组统计（前10个）
    const modelStats = await prisma.authorization.groupBy({
      by: ['modelId'],
      where: {
        userId
      },
      _count: true,
      orderBy: {
        _count: {
          modelId: 'desc'
        }
      },
      take: 10
    });

    // 按设备分组统计（前10个）
    const deviceStats = await prisma.authorization.groupBy({
      by: ['deviceFingerprint'],
      where: {
        userId
      },
      _count: true,
      orderBy: {
        _count: {
          deviceFingerprint: 'desc'
        }
      },
      take: 10
    });

    return {
      statusStats,
      total,
      last7DaysCount,
      last30DaysCount,
      activeCount,
      totalFrozenQuota,
      modelStats,
      deviceStats
    };
  }

  /**
   * 获取全部用户的授权统计（支持筛选，用于授权统计看板）
   * @param {Object} filters - 可选: deviceFingerprint, userId, status, startDate, endDate
   */
  async getAllUsersAuthorizationStats(filters = {}) {
    const now = new Date();
    const baseWhere = {};

    if (filters.deviceFingerprint) {
      baseWhere.deviceFingerprint = { contains: filters.deviceFingerprint };
    }
    if (filters.userId) {
      baseWhere.userId = filters.userId;
    }
    if (filters.status) {
      baseWhere.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      baseWhere.createdAt = {};
      if (filters.startDate) {
        baseWhere.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        baseWhere.createdAt.lte = new Date(filters.endDate);
      }
    }

    // 按状态分组统计
    const statusStats = await prisma.authorization.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: true
    });

    // 总授权数量
    const total = await prisma.authorization.count({ where: baseWhere });

    // 今日新增授权数（在 baseWhere 基础上限制为今日创建）
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const newTodayCreatedAt = { gte: todayStart, ...(baseWhere.createdAt || {}) };
    const newTodayWhere = { ...baseWhere, createdAt: newTodayCreatedAt };
    const newToday = await prisma.authorization.count({ where: newTodayWhere });

    // 最近7天的授权数量
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysCount = await prisma.authorization.count({
      where: {
        ...baseWhere,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    // 最近30天的授权数量
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DaysCount = await prisma.authorization.count({
      where: {
        ...baseWhere,
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    // 当前活跃授权数量（未过期且状态为 active）
    const activeWhere = {
      ...baseWhere,
      status: 'active',
      expiresAt: { gt: now }
    };
    const activeCount = await prisma.authorization.count({ where: activeWhere });

    // 昨日同一时刻的活跃授权数（用于计算“较昨日新增”）
    const yesterdayNow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeCountYesterday = await prisma.authorization.count({
      where: {
        ...baseWhere,
        status: 'active',
        expiresAt: { gt: yesterdayNow },
        createdAt: { lte: yesterdayNow }
      }
    });
    const newActiveComparedYesterday = Math.max(0, activeCount - activeCountYesterday);

    // 当前冻结的额度总和（活跃授权）
    const activeAuthorizations = await prisma.authorization.findMany({
      where: activeWhere,
      select: { frozenQuota: true }
    });
    const totalFrozenQuota = activeAuthorizations.reduce((sum, auth) => {
      return sum + parseFloat(auth.frozenQuota || 0);
    }, 0);

    // 按模型分组统计（前10个），再补全模型名称
    const modelGroupBy = await prisma.authorization.groupBy({
      by: ['modelId'],
      where: baseWhere,
      _count: true
    });
    const modelIds = modelGroupBy.map((m) => m.modelId).slice(0, 10);
    const modelList = modelIds.length
      ? await prisma.aIModel.findMany({
          where: { id: { in: modelIds } },
          select: { id: true, name: true, displayName: true }
        })
      : [];
    const modelMap = Object.fromEntries(modelList.map((m) => [m.id, m]));
    const modelStats = modelGroupBy
      .slice(0, 10)
      .sort((a, b) => b._count - a._count)
      .map((m) => ({
        modelId: m.modelId,
        modelName: modelMap[m.modelId]?.name || m.modelId,
        displayName: modelMap[m.modelId]?.displayName || modelMap[m.modelId]?.name || m.modelId,
        _count: m._count
      }));

    // 按用户分组统计（前10个），用于高频授权排行，并补全用户信息与额度占比
    const userGroupBy = await prisma.authorization.groupBy({
      by: ['userId'],
      where: baseWhere,
      _count: true
    });
    const sortedUserStats = userGroupBy.sort((a, b) => b._count - a._count).slice(0, 10);
    const userIds = sortedUserStats.map((u) => u.userId);
    const userList = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, phone: true }
        })
      : [];
    const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));
    const userStats = sortedUserStats.map((u) => ({
      userId: u.userId,
      email: userMap[u.userId]?.email || null,
      phone: userMap[u.userId]?.phone || null,
      _count: u._count,
      quotaPercentage: total > 0 ? Math.round((u._count / total) * 100) : 0
    }));

    // 按设备分组统计（前10个）
    const deviceGroupBy = await prisma.authorization.groupBy({
      by: ['deviceFingerprint'],
      where: baseWhere,
      _count: true
    });
    const deviceStats = deviceGroupBy
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map((d) => ({ deviceFingerprint: d.deviceFingerprint, _count: d._count }));

    // 去重用户总数
    const uniqueUsersGroup = await prisma.authorization.groupBy({
      by: ['userId'],
      where: baseWhere,
      _count: true
    });
    const uniqueUsersCount = uniqueUsersGroup.length;

    // 活跃率（百分比）
    const activeRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    // 最近7天每日授权数（授权增长趋势）
    const trendStart = new Date(now);
    trendStart.setDate(trendStart.getDate() - 6);
    trendStart.setHours(0, 0, 0, 0);
    const trendLogs = await prisma.authorization.findMany({
      where: { ...baseWhere, createdAt: { gte: trendStart } },
      select: { createdAt: true }
    });
    const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const trendByDay = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(trendStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      trendByDay[key] = { date: key, dayLabel: dayLabels[d.getDay()], count: 0 };
    }
    trendLogs.forEach((log) => {
      const key = new Date(log.createdAt).toISOString().slice(0, 10);
      if (trendByDay[key]) trendByDay[key].count += 1;
    });
    const trendLast7Days = Object.keys(trendByDay)
      .sort()
      .map((k) => trendByDay[k]);

    return {
      statusStats,
      total,
      newToday,
      last7DaysCount,
      last30DaysCount,
      activeCount,
      newActiveComparedYesterday,
      totalFrozenQuota,
      uniqueUsersCount,
      activeRate,
      modelStats,
      userStats,
      deviceStats,
      trendLast7Days
    };
  }
}

module.exports = new AuthorizationRepository();
