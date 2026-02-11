const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

/**
 * 设备数据访问层
 */
class DeviceRepository {
  /**
   * 获取设备列表（分页，支持跨用户查询）
   */
  async findDevices(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where = {};

    if (filters.id) {
      where.id = filters.id;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.deviceFingerprint) {
      // 精确匹配设备指纹
      where.deviceFingerprint = filters.deviceFingerprint;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.ipAddress) {
      // 精确匹配IP地址
      where.ipAddress = filters.ipAddress;
    }

    if (filters.lastUsedAt) {
      where.lastUsedAt = {};
      if (filters.lastUsedAt.gte) {
        where.lastUsedAt.gte = new Date(filters.lastUsedAt.gte);
      }
      if (filters.lastUsedAt.lte) {
        where.lastUsedAt.lte = new Date(filters.lastUsedAt.lte);
      }
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
    if (sort.orderBy === 'createdAt') {
      orderBy.createdAt = sort.order || 'desc';
    } else {
      // 默认按最后使用时间排序
      orderBy.lastUsedAt = sort.order || 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.device.findMany({
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
          }
        }
      }),
      prisma.device.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 获取用户设备列表（仅限该用户）
   */
  async findUserDevices(userId, pagination = {}, filters = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      prisma.device.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          lastUsedAt: 'desc'
        }
      }),
      prisma.device.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取设备
   */
  async findById(deviceId) {
    return await prisma.device.findUnique({
      where: { id: deviceId },
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
   * 根据用户ID和设备指纹获取设备
   */
  async findByUserAndFingerprint(userId, deviceFingerprint) {
    return await prisma.device.findFirst({
      where: {
        userId,
        deviceFingerprint
      }
    });
  }

  /**
   * 创建设备
   */
  async create(data) {
    return await prisma.device.create({
      data: {
        userId: data.userId,
        deviceFingerprint: data.deviceFingerprint,
        name: data.name || null,
        remark: data.remark || null,
        ipAddress: data.ipAddress || null,
        region: data.region || null,
        status: data.status || 'active',
        lastUsedAt: new Date()
      }
    });
  }

  /**
   * 更新设备信息
   */
  async update(deviceId, data) {
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.region !== undefined) updateData.region = data.region;

    updateData.updatedAt = new Date();

    return await prisma.device.update({
      where: { id: deviceId },
      data: updateData
    });
  }

  /**
   * 更新设备最后使用时间
   */
  async updateLastUsed(deviceId, ipAddress = null) {
    const updateData = {
      lastUsedAt: new Date(),
      updatedAt: new Date()
    };

    if (ipAddress) {
      updateData.ipAddress = ipAddress;
    }

    return await prisma.device.update({
      where: { id: deviceId },
      data: updateData
    });
  }

  /**
   * 更新设备状态
   */
  async updateStatus(deviceId, status) {
    return await prisma.device.update({
      where: { id: deviceId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 删除设备
   */
  async delete(deviceId) {
    return await prisma.device.delete({
      where: { id: deviceId }
    });
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(ids, status) {
    return await prisma.device.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 批量删除
   */
  async batchDelete(ids) {
    return await prisma.device.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }

  /**
   * 统计用户设备数量
   */
  async countUserDevices(userId, status = null) {
    const where = { userId };
    if (status) {
      where.status = status;
    }
    return await prisma.device.count({ where });
  }

  /**
   * 获取用户当前设备（基于设备指纹）
   */
  async findCurrentDevice(userId, deviceFingerprint) {
    return await prisma.device.findFirst({
      where: {
        userId,
        deviceFingerprint,
        status: 'active'
      }
    });
  }
}

module.exports = new DeviceRepository();

