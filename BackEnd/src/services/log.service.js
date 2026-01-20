const prisma = require('../config/database');

/**
 * 日志服务
 */
class LogService {
  /**
   * 记录管理员操作日志
   */
  async logAdminAction(data) {
    try {
      return await prisma.operationLog.create({
        data: {
          adminId: data.adminId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId || null,
          details: typeof data.details === 'string' ? data.details : JSON.stringify(data.details),
          ipAddress: data.ipAddress || null,
          result: data.result || 'success',
          errorMessage: data.errorMessage || null
        }
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
      // 日志记录失败不应该影响主流程
      return null;
    }
  }

  /**
   * 获取管理员操作日志列表
   */
  async getOperationLogs(filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters.targetId) {
      where.targetId = filters.targetId;
    }

    if (filters.result) {
      where.result = filters.result;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const orderBy = {
      createdAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      }),
      prisma.operationLog.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 获取 AI 调用日志列表
   */
  async getAICallLogs(filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.modelId) {
      where.modelId = filters.modelId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.requestId) {
      where.requestId = filters.requestId;
    }

    if (filters.startDate || filters.endDate) {
      where.requestTime = {};
      if (filters.startDate) {
        where.requestTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.requestTime.lte = new Date(filters.endDate);
      }
    }

    const orderBy = {
      requestTime: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.aICallLog.findMany({
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
            select: {
              id: true,
              name: true,
              displayName: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                  displayName: true
                }
              }
            }
          }
        }
      }),
      prisma.aICallLog.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 获取 AI 调用日志详情
   */
  async getAICallLogDetail(requestId) {
    return await prisma.aICallLog.findUnique({
      where: { requestId },
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
    });
  }

  /**
   * 获取操作日志详情
   */
  async getOperationLogDetail(id) {
    return await prisma.operationLog.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }
}

module.exports = new LogService();
