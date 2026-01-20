const prisma = require('../config/database');

/**
 * 用户套餐数据访问层
 */
class UserPackageRepository {
  /**
   * 获取用户套餐列表
   */
  async findUserPackages(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.packageId) {
      where.packageId = filters.packageId;
    }

    // 筛选未过期的套餐
    if (filters.activeOnly) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    }

    if (filters.expiresAt) {
      where.expiresAt = {};
      if (filters.expiresAt.lte) {
        where.expiresAt.lte = new Date(filters.expiresAt.lte);
      }
    }

    const orderBy = {
      priority: 'desc',
      createdAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.userPackage.findMany({
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
          },
          package: true
        }
      }),
      prisma.userPackage.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取用户套餐
   */
  async findById(id) {
    return await prisma.userPackage.findUnique({
      where: { id },
      include: {
        user: true,
        package: true
      }
    });
  }

  /**
   * 检查用户是否已有该套餐
   */
  async findByUserAndPackage(userId, packageId) {
    return await prisma.userPackage.findUnique({
      where: {
        userId_packageId: {
          userId,
          packageId
        }
      }
    });
  }

  /**
   * 创建用户套餐
   */
  async create(data) {
    // 计算过期时间
    let expiresAt = null;
    if (data.expiresAt) {
      expiresAt = new Date(data.expiresAt);
    } else if (data.packageDuration) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.packageDuration);
    }

    return await prisma.userPackage.create({
      data: {
        userId: data.userId,
        packageId: data.packageId,
        startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        expiresAt: expiresAt,
        priority: data.priority || 0
      },
      include: {
        user: true,
        package: true
      }
    });
  }

  /**
   * 更新用户套餐
   */
  async update(id, data) {
    const updateData = {};

    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    updateData.updatedAt = new Date();

    return await prisma.userPackage.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        package: true
      }
    });
  }

  /**
   * 延期套餐
   */
  async extendExpiry(id, days) {
    const userPackage = await prisma.userPackage.findUnique({
      where: { id }
    });

    if (!userPackage) {
      throw new Error('User package not found');
    }

    const currentExpiry = userPackage.expiresAt || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + days);

    return await prisma.userPackage.update({
      where: { id },
      data: {
        expiresAt: newExpiry,
        updatedAt: new Date()
      },
      include: {
        user: true,
        package: true
      }
    });
  }

  /**
   * 删除用户套餐
   */
  async delete(id) {
    return await prisma.userPackage.delete({
      where: { id }
    });
  }

  /**
   * 获取用户的活跃套餐列表（按优先级排序）
   */
  async findActiveUserPackages(userId) {
    const now = new Date();
    return await prisma.userPackage.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      include: {
        package: true
      },
      orderBy: {
        priority: 'desc'
      }
    });
  }
}

module.exports = new UserPackageRepository();
