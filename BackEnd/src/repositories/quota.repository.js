const prisma = require('../config/database');

/**
 * 额度数据访问层
 */
class QuotaRepository {
  /**
   * 获取用户额度列表
   */
  async findQuotas(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    const orderBy = {
      updatedAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.userQuota.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true
            }
          }
        }
      }),
      prisma.userQuota.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据ID获取额度
   */
  async findById(id) {
    const quota = await prisma.userQuota.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true
          }
        }
      }
    });

    // 如果有 packageId，查询套餐信息
    if (quota && quota.packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: quota.packageId },
        select: {
          id: true,
          name: true,
          displayName: true
        }
      });
      quota.package = pkg;
    }

    return quota;
  }

  /**
   * 根据用户ID和套餐ID获取额度
   */
  async findByUserAndPackage(userId, packageId) {
    return await prisma.userQuota.findFirst({
      where: {
        userId,
        packageId: packageId || null
      },
      include: {
        user: true
      }
    });
  }

  /**
   * 获取用户的所有额度
   */
  async findByUser(userId) {
    return await prisma.userQuota.findMany({
      where: { userId },
      include: {
        user: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  /**
   * 创建或更新用户额度
   */
  async upsertQuota(userId, packageId, data) {
    // 先查找是否存在
    const existing = await prisma.userQuota.findFirst({
      where: {
        userId,
        packageId: packageId || null
      }
    });

    if (existing) {
      // 更新
      return await prisma.userQuota.update({
        where: { id: existing.id },
        data: {
          available: data.available !== undefined ? data.available : existing.available,
          frozen: data.frozen !== undefined ? data.frozen : existing.frozen,
          used: data.used !== undefined ? data.used : existing.used
        }
      });
    } else {
      // 创建
      return await prisma.userQuota.create({
        data: {
          userId,
          packageId: packageId || null,
          available: data.available || 0,
          frozen: data.frozen || 0,
          used: data.used || 0
        }
      });
    }
  }

  /**
   * 冻结额度（预冻结）
   */
  async freezeQuota(userId, packageId, amount) {
    const quota = await this.findByUserAndPackage(userId, packageId);
    if (!quota) {
      throw new Error('Quota not found');
    }

    if (quota.available < amount) {
      throw new Error('Insufficient quota');
    }

    return await prisma.userQuota.update({
      where: { id: quota.id },
      data: {
        available: {
          decrement: amount
        },
        frozen: {
          increment: amount
        }
      }
    });
  }

  /**
   * 解冻额度
   */
  async unfreezeQuota(userId, packageId, amount) {
    const quota = await this.findByUserAndPackage(userId, packageId);
    if (!quota) {
      throw new Error('Quota not found');
    }

    return await prisma.userQuota.update({
      where: { id: quota.id },
      data: {
        available: {
          increment: amount
        },
        frozen: {
          decrement: amount
        }
      }
    });
  }

  /**
   * 扣减额度（结算）
   */
  async deductQuota(userId, packageId, amount) {
    const quota = await this.findByUserAndPackage(userId, packageId);
    if (!quota) {
      throw new Error('Quota not found');
    }

    return await prisma.userQuota.update({
      where: { id: quota.id },
      data: {
        frozen: {
          decrement: amount
        },
        used: {
          increment: amount
        }
      }
    });
  }

  /**
   * 增加额度
   */
  async increaseQuota(userId, packageId, amount) {
    const quota = await this.findByUserAndPackage(userId, packageId);
    if (!quota) {
      throw new Error('Quota not found');
    }

    return await prisma.userQuota.update({
      where: { id: quota.id },
      data: {
        available: {
          increment: amount
        }
      }
    });
  }

  /**
   * 根据ID冻结额度
   */
  async freezeQuotaById(id, amount) {
    const quota = await this.findById(id);
    if (!quota) {
      throw new Error('Quota not found');
    }

    if (parseFloat(quota.available) < amount) {
      throw new Error('Insufficient quota');
    }

    return await prisma.userQuota.update({
      where: { id },
      data: {
        available: {
          decrement: amount
        },
        frozen: {
          increment: amount
        }
      }
    });
  }

  /**
   * 根据ID解冻额度
   */
  async unfreezeQuotaById(id, amount) {
    const quota = await this.findById(id);
    if (!quota) {
      throw new Error('Quota not found');
    }

    if (parseFloat(quota.frozen) < amount) {
      throw new Error('Insufficient frozen quota');
    }

    return await prisma.userQuota.update({
      where: { id },
      data: {
        available: {
          increment: amount
        },
        frozen: {
          decrement: amount
        }
      }
    });
  }

  /**
   * 根据ID设置额度
   */
  async setQuotaById(id, data) {
    return await prisma.userQuota.update({
      where: { id },
      data: {
        available: data.available !== undefined ? data.available : undefined,
        frozen: data.frozen !== undefined ? data.frozen : undefined,
        used: data.used !== undefined ? data.used : undefined
      }
    });
  }

  /**
   * 根据ID重置额度（清零）
   */
  async resetQuotaById(id) {
    return await prisma.userQuota.update({
      where: { id },
      data: {
        available: 0,
        frozen: 0,
        used: 0
      }
    });
  }

  /**
   * 根据ID批量查询额度
   */
  async findByIds(ids) {
    return await prisma.userQuota.findMany({
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
            phone: true,
            status: true
          }
        }
      }
    });
  }

  /**
   * 获取额度统计信息
   */
  async getStatistics(filters = {}) {
    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    const [quotas, userQuotas, packageQuotas] = await Promise.all([
      prisma.userQuota.findMany({
        where,
        select: {
          available: true,
          frozen: true,
          used: true
        }
      }),
      filters.userId
        ? Promise.resolve([{ userId: filters.userId }])
        : prisma.userQuota.findMany({
            where,
            select: { userId: true }
          }),
      filters.packageId
        ? Promise.resolve([{ packageId: filters.packageId }])
        : prisma.userQuota.findMany({
            where,
            select: { packageId: true }
          })
    ]);

    const totalAvailable = quotas.reduce((sum, q) => sum + parseFloat(q.available || 0), 0);
    const totalFrozen = quotas.reduce((sum, q) => sum + parseFloat(q.frozen || 0), 0);
    const totalUsed = quotas.reduce((sum, q) => sum + parseFloat(q.used || 0), 0);
    const totalQuota = totalAvailable + totalFrozen + totalUsed;

    // 去重统计用户数和套餐数
    const uniqueUserIds = new Set(userQuotas.map(q => q.userId).filter(Boolean));
    const uniquePackageIds = new Set(packageQuotas.map(q => q.packageId).filter(Boolean));

    return {
      totalAvailable,
      totalFrozen,
      totalUsed,
      totalQuota,
      terminalUserCount: uniqueUserIds.size,
      packageCount: uniquePackageIds.size
    };
  }
}

module.exports = new QuotaRepository();
