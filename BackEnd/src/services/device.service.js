const prisma = require('../config/database');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const deviceRepository = require('../repositories/device.repository');

/**
 * 设备服务
 */
class DeviceService {
  /**
   * 验证设备指纹格式
   */
  validateDeviceFingerprint(deviceFingerprint) {
    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      throw new BadRequestError('Device fingerprint is required');
    }

    // 设备指纹长度限制
    if (deviceFingerprint.length < 8 || deviceFingerprint.length > 255) {
      throw new BadRequestError('Device fingerprint must be between 8 and 255 characters');
    }

    // 设备指纹格式验证（允许字母、数字、连字符、下划线）
    const fingerprintPattern = /^[a-zA-Z0-9_-]+$/;
    if (!fingerprintPattern.test(deviceFingerprint)) {
      throw new BadRequestError('Invalid device fingerprint format');
    }

    return true;
  }

  /**
   * 检查设备是否被禁用
   */
  async checkDeviceStatus(userId, deviceFingerprint) {
    const device = await prisma.device.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      }
    });

    if (device && device.status === 'revoked') {
      throw new BadRequestError('Device has been revoked');
    }

    return device;
  }

  /**
   * 创建或更新设备记录
   */
  async upsertDevice(userId, deviceFingerprint, ipAddress = null, name = null) {
    // 验证设备指纹
    this.validateDeviceFingerprint(deviceFingerprint);

    // 检查设备状态
    await this.checkDeviceStatus(userId, deviceFingerprint);

    // 创建或更新设备记录
    const device = await prisma.device.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      },
      update: {
        lastUsedAt: new Date(),
        ipAddress: ipAddress || undefined,
        status: 'active' // 如果之前被撤销，现在重新激活
      },
      create: {
        userId,
        deviceFingerprint,
        name: name || `Device ${deviceFingerprint.substring(0, 8)}`,
        ipAddress,
        status: 'active',
        lastUsedAt: new Date()
      }
    });

    return device;
  }

  /**
   * 获取设备列表（管理员）
   */
  async getDevices(filters = {}, pagination = {}, sort = {}) {
    // 处理筛选条件
    const whereFilters = {};
    
    if (filters.deviceId) {
      whereFilters.id = filters.deviceId;
    }
    
    if (filters.userId) {
      whereFilters.userId = filters.userId;
    }
    
    if (filters.deviceFingerprint) {
      whereFilters.deviceFingerprint = filters.deviceFingerprint;
    }
    
    if (filters.status) {
      whereFilters.status = filters.status;
    }
    
    if (filters.ipAddress) {
      whereFilters.ipAddress = filters.ipAddress;
    }
    
    // 处理时间范围筛选
    if (filters.lastUsedStart || filters.lastUsedEnd) {
      whereFilters.lastUsedAt = {};
      if (filters.lastUsedStart) {
        whereFilters.lastUsedAt.gte = filters.lastUsedStart;
      }
      if (filters.lastUsedEnd) {
        whereFilters.lastUsedAt.lte = filters.lastUsedEnd;
      }
    }
    
    if (filters.startDate || filters.endDate) {
      whereFilters.createdAt = {};
      if (filters.startDate) {
        whereFilters.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereFilters.createdAt.lte = filters.endDate;
      }
    }
    
    // 处理排序
    const sortOptions = {
      orderBy: sort.orderBy || 'lastUsedAt',
      order: sort.order || 'desc'
    };
    
    return await deviceRepository.findDevices(whereFilters, pagination, sortOptions);
  }

  /**
   * 获取用户设备列表（终端用户）
   */
  async getUserDevices(userId, pagination = {}, filters = {}) {
    return await deviceRepository.findUserDevices(userId, pagination, filters);
  }

  /**
   * 获取设备详情
   */
  async getDeviceDetail(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    return device;
  }

  /**
   * 获取用户当前设备信息（终端用户）
   */
  async getCurrentDevice(userId, deviceFingerprint) {
    const device = await deviceRepository.findCurrentDevice(userId, deviceFingerprint);
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    return device;
  }

  /**
   * 获取用户设备数量上限（终端用户）
   */
  async getDeviceLimit(userId) {
    // 获取用户的所有活跃套餐，按优先级排序
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        package: true
      },
      orderBy: {
        priority: 'desc'
      }
    });

    // 找到优先级最高的套餐
    const effectivePackage = userPackages.length > 0 ? userPackages[0] : null;
    const maxDevices = effectivePackage?.package?.maxDevices || null;

    // 统计用户已绑定的设备数量（包括活跃和已撤销的）
    const boundDevicesCount = await deviceRepository.countUserDevices(userId);

    // 计算剩余槽位
    const remainingSlots = maxDevices !== null 
      ? Math.max(0, maxDevices - boundDevicesCount)
      : null;

    return {
      maxDevices,
      boundDevicesCount,
      remainingSlots,
      effectivePackage: effectivePackage ? {
        id: effectivePackage.package.id,
        name: effectivePackage.package.name,
        displayName: effectivePackage.package.displayName,
        priority: effectivePackage.priority
      } : null
    };
  }

  /**
   * 更新设备信息（终端用户）
   */
  async updateDevice(id, userId, data) {
    // 验证设备属于该用户
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    if (device.userId !== userId) {
      throw new BadRequestError('Device does not belong to this user');
    }

    // 只允许更新 name 和 remark
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.remark !== undefined) updateData.remark = data.remark;

    return await deviceRepository.update(id, updateData);
  }

  /**
   * 更新设备信息（管理员）
   */
  async updateDeviceByAdmin(id, data) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    return await deviceRepository.update(id, data);
  }

  /**
   * 解绑设备（终端用户）
   */
  async revokeDevice(id, userId) {
    // 验证设备属于该用户
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    if (device.userId !== userId) {
      throw new BadRequestError('Device does not belong to this user');
    }

    return await deviceRepository.updateStatus(id, 'revoked');
  }

  /**
   * 强制解绑设备（管理员）
   */
  async revokeDeviceByAdmin(id, adminId, ipAddress) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    const updated = await deviceRepository.updateStatus(id, 'revoked');

    // 记录操作日志
    const logService = require('./log.service');
    await logService.logAdminAction({
      adminId,
      action: 'REVOKE_DEVICE',
      targetType: 'device',
      targetId: id,
      details: { userId: device.userId },
      ipAddress
    });

    return updated;
  }

  /**
   * 恢复设备（管理员）
   */
  async allowDevice(id, adminId, ipAddress) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    if (device.status !== 'revoked') {
      throw new BadRequestError('Device status is not revoked, cannot allow');
    }

    const updated = await deviceRepository.updateStatus(id, 'active');

    // 记录操作日志
    const logService = require('./log.service');
    await logService.logAdminAction({
      adminId,
      action: 'ALLOW_DEVICE',
      targetType: 'device',
      targetId: id,
      details: { userId: device.userId },
      ipAddress
    });

    return updated;
  }

  /**
   * 批量更新状态（管理员）
   */
  async batchUpdateStatus(ids, status, adminId, ipAddress) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('Device IDs are required');
    }

    if (!['active', 'revoked'].includes(status)) {
      throw new BadRequestError('Invalid status');
    }

    const result = await deviceRepository.batchUpdateStatus(ids, status);

    // 记录操作日志
    const logService = require('./log.service');
    await logService.logAdminAction({
      adminId,
      action: 'BATCH_UPDATE_DEVICE_STATUS',
      targetType: 'device',
      targetId: null,
      details: { ids, status, count: result.count },
      ipAddress
    });

    return {
      count: result.count,
      failed: ids.length - result.count
    };
  }

  /**
   * 批量删除（管理员）
   */
  async batchDelete(ids, adminId, ipAddress) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('Device IDs are required');
    }

    const result = await deviceRepository.batchDelete(ids);

    // 记录操作日志
    const logService = require('./log.service');
    await logService.logAdminAction({
      adminId,
      action: 'BATCH_DELETE_DEVICE',
      targetType: 'device',
      targetId: null,
      details: { ids, count: result.count },
      ipAddress
    });

    return {
      count: result.count,
      failed: ids.length - result.count
    };
  }

  /**
   * 获取用户设备列表（旧方法，保留兼容性）
   */
  async getUserDevices(userId) {
    return await prisma.device.findMany({
      where: {
        userId,
        status: 'active'
      },
      orderBy: {
        lastUsedAt: 'desc'
      }
    });
  }
}

module.exports = new DeviceService();
