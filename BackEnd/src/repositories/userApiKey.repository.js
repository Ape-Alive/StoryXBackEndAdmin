const prisma = require('../config/database');

/**
 * 用户API Key数据访问层
 */
class UserApiKeyRepository {
  /**
   * 创建用户API Key
   */
  async create(data) {
    return await prisma.userApiKey.create({
      data: {
        userId: data.userId || null,
        providerId: data.providerId,
        apiKey: data.apiKey, // 加密后的
        apiKeyId: data.apiKeyId || null,
        name: data.name,
        type: data.type,
        credits: data.credits || 0,
        expireTime: data.expireTime || 0,
        status: data.status || 'active',
        packageId: data.packageId || null,
        createdBy: data.createdBy || null
      }
    });
  }

  /**
   * 根据ID查找API Key
   */
  async findById(id) {
    return await prisma.userApiKey.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });
  }

  /**
   * 查找用户和提供商的活跃API Key
   */
  async findActiveByUserAndProvider(userId, providerId) {
    const now = Math.floor(Date.now() / 1000);
    
    return await prisma.userApiKey.findMany({
      where: {
        userId,
        providerId,
        status: 'active',
        OR: [
          { expireTime: 0 }, // 永不过期
          { expireTime: { gt: now } } // 未过期
        ]
      },
      orderBy: [
        { type: 'asc' }, // user_created优先
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * 查找用户的所有API Key
   */
  async findByUser(userId, filters = {}) {
    const where = {
      userId
    };

    if (filters.providerId) {
      where.providerId = filters.providerId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return await prisma.userApiKey.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * 查找提供商的API Key列表
   */
  async findByProvider(providerId, filters = {}) {
    const where = {
      providerId
    };

    // 处理 userId 筛选：null 表示系统级API Key，undefined 表示不过滤
    if (filters.hasOwnProperty('userId')) {
      if (filters.userId === null) {
        // 查找系统级API Key（userId为null）
        where.userId = null;
      } else {
        // 查找特定用户的API Key
        where.userId = filters.userId;
      }
    }
    // 如果 filters.userId 是 undefined，则不添加 userId 条件，查询所有API Key

    if (filters.status) {
      where.status = filters.status;
    }

    const result = await prisma.userApiKey.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 处理 BigInt 序列化问题：将 BigInt 字段转换为数字
    return result.map(item => {
      const processed = { ...item };
      // 处理 expireTime（可能是 BigInt）：转换为数字（秒级时间戳）
      if (typeof processed.expireTime === 'bigint') {
        processed.expireTime = Number(processed.expireTime);
      } else if (processed.expireTime !== null && processed.expireTime !== undefined) {
        // 确保是数字类型
        processed.expireTime = Number(processed.expireTime);
      }
      // 处理 credits（可能是 BigInt 或 Decimal）：转换为数字
      if (typeof processed.credits === 'bigint') {
        processed.credits = parseFloat(processed.credits.toString());
      } else if (processed.credits !== null && processed.credits !== undefined) {
        processed.credits = parseFloat(processed.credits.toString());
      }
      return processed;
    });
  }

  /**
   * 更新API Key状态
   */
  async updateStatus(id, status) {
    return await prisma.userApiKey.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * 删除API Key
   */
  async delete(id) {
    return await prisma.userApiKey.delete({
      where: { id }
    });
  }

  /**
   * 批量更新过期API Key状态
   */
  async updateExpiredStatus() {
    const now = Math.floor(Date.now() / 1000);
    
    return await prisma.userApiKey.updateMany({
      where: {
        status: 'active',
        expireTime: { gt: 0, lte: now }
      },
      data: {
        status: 'expired'
      }
    });
  }

  /**
   * 更新套餐关联的API Key过期时间
   * @param {string} userId - 用户ID
   * @param {string} packageId - 套餐ID
   * @param {number} expireTime - 新的过期时间（Unix时间戳，秒）
   */
  async updateExpireTimeByPackage(userId, packageId, expireTime) {
    return await prisma.userApiKey.updateMany({
      where: {
        userId,
        packageId,
        status: { in: ['active', 'expired'] } // 包括已过期的，延期后可以重新激活
        // 只更新系统创建的API Key，用户创建的API Key不受套餐过期时间影响
        // type: 'system_created' // 如果需要只更新系统创建的，可以添加这个条件
      },
      data: {
        expireTime: expireTime || 0
      }
    });
  }
}

module.exports = new UserApiKeyRepository();
