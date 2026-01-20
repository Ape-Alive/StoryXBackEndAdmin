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
        type: data.type,
        amount: data.amount,
        calls: data.calls || 0,
        before: data.before,
        after: data.after,
        reason: data.reason || null,
        requestId: data.requestId || null
      }
    });
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

module.exports = new QuotaRecordRepository();
