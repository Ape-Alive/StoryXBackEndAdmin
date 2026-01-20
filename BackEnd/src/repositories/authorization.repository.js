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

    if (filters.sessionToken) {
      where.sessionToken = filters.sessionToken;
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
   * 根据 sessionToken 获取授权记录
   */
  async findBySessionToken(sessionToken) {
    return await prisma.authorization.findUnique({
      where: { sessionToken },
      include: {
        user: true,
        model: true
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
   * 获取用户授权统计
   */
  async getUserAuthorizationStats(userId) {
    const stats = await prisma.authorization.groupBy({
      by: ['status'],
      where: {
        userId
      },
      _count: true
    });

    const total = await prisma.authorization.count({
      where: { userId }
    });

    return {
      stats,
      total
    };
  }
}

module.exports = new AuthorizationRepository();
