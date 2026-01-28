const deviceRepository = require('../repositories/device.repository');
const packageRepository = require('../repositories/package.repository');
const userPackageRepository = require('../repositories/userPackage.repository');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * 设备业务逻辑层
 */
class DeviceService {
  /**
   * 获取设备列表（管理员，跨用户查询）
   */
  async getDevices(filters = {}, pagination = {}, sort = {}) {
    const queryFilters = {};

    if (filters.deviceId) {
      queryFilters.id = filters.deviceId;
    }

    if (filters.userId) {
      queryFilters.userId = filters.userId;
    }

    if (filters.deviceFingerprint) {
      queryFilters.deviceFingerprint = filters.deviceFingerprint;
    }

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.ipAddress) {
      queryFilters.ipAddress = filters.ipAddress;
    }

    if (filters.lastUsedStart || filters.lastUsedEnd) {
      queryFilters.lastUsedAt = {};
      if (filters.lastUsedStart) queryFilters.lastUsedAt.gte = new Date(filters.lastUsedStart);
      if (filters.lastUsedEnd) queryFilters.lastUsedAt.lte = new Date(filters.lastUsedEnd);
    }

    if (filters.startDate || filters.endDate) {
      queryFilters.createdAt = {};
      if (filters.startDate) queryFilters.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) queryFilters.createdAt.lte = new Date(filters.endDate);
    }

    // 构建排序
    const sortOrder = {};
    if (sort.orderBy) {
      const order = sort.order === 'desc' ? 'desc' : 'asc';
      sortOrder[sort.orderBy] = order;
    } else {
      sortOrder.lastUsedAt = 'desc';
    }

    const result = await deviceRepository.findDevices(
      queryFilters,
      {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 20
      },
      sortOrder
    );

    return result;
  }

  /**
   * 获取用户设备列表（终端用户）
   */
  async getUserDevices(userId, pagination = {}, filters = {}) {
    const result = await deviceRepository.findUserDevices(userId, pagination, filters);
    return result;
  }

  /**
   * 获取设备详情
   */
  async getDeviceDetail(deviceId) {
    const device = await deviceRepository.findById(deviceId);
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
      throw new NotFoundError('Current device not found');
    }
    return device;
  }

  /**
   * 获取用户设备数量上限（终端用户）
   */
  async getDeviceLimit(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 获取用户活跃套餐（按优先级排序）
    const activePackages = await userPackageRepository.findActiveUserPackages(userId);

    let maxDevices = null; // null 表示无限
    let effectivePackage = null;

    // 找到最高优先级的套餐
    if (activePackages.length > 0) {
      effectivePackage = activePackages[0].package;
      if (effectivePackage && effectivePackage.maxDevices !== null) {
        maxDevices = effectivePackage.maxDevices;
      }
    }

    // 统计当前绑定设备数量（仅统计 active 状态）
    const boundDevicesCount = await deviceRepository.countUserDevices(userId, 'active');
    const remainingSlots = maxDevices === null ? null : Math.max(0, maxDevices - boundDevicesCount);

    return {
      maxDevices,
      boundDevicesCount,
      remainingSlots,
      effectivePackage: effectivePackage ? {
        id: effectivePackage.id,
        name: effectivePackage.name,
        displayName: effectivePackage.displayName,
        priority: activePackages[0].priority
      } : null
    };
  }

  /**
   * 更新设备信息（终端用户）
   */
  async updateDevice(deviceId, userId, data) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    // 验证设备属于该用户
    if (device.userId !== userId) {
      throw new ForbiddenError('Device does not belong to you');
    }

    // 只允许更新 name 和 remark
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.remark !== undefined) updateData.remark = data.remark;

    const updated = await deviceRepository.update(deviceId, updateData);
    return updated;
  }

  /**
   * 更新设备信息（管理员）
   */
  async updateDeviceByAdmin(deviceId, data) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    const updated = await deviceRepository.update(deviceId, data);
    return updated;
  }

  /**
   * 解绑设备（终端用户）
   */
  async revokeDevice(deviceId, userId) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    // 验证设备属于该用户
    if (device.userId !== userId) {
      throw new ForbiddenError('Device does not belong to you');
    }

    // 更新设备状态为 revoked
    const updated = await deviceRepository.updateStatus(deviceId, 'revoked');

    // 使该设备相关的授权失效
    await this.revokeDeviceAuthorizations(deviceId, userId);

    return updated;
  }

  /**
   * 强制解绑设备（管理员）
   */
  async revokeDeviceByAdmin(deviceId, adminId = null, ipAddress = null) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    // 更新设备状态为 revoked
    const updated = await deviceRepository.updateStatus(deviceId, 'revoked');

    // 使该设备相关的授权失效
    await this.revokeDeviceAuthorizations(deviceId, device.userId);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'REVOKE_DEVICE',
        targetType: 'device',
        targetId: deviceId,
        details: { userId: device.userId, deviceFingerprint: device.deviceFingerprint },
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 恢复设备（管理员）
   */
  async allowDevice(deviceId, adminId = null, ipAddress = null) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    const updated = await deviceRepository.updateStatus(deviceId, 'active');

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'ALLOW_DEVICE',
        targetType: 'device',
        targetId: deviceId,
        details: { userId: device.userId, deviceFingerprint: device.deviceFingerprint },
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 批量更新设备状态（管理员）
   */
  async batchUpdateStatus(ids, status, adminId = null, ipAddress = null) {
    const result = await deviceRepository.batchUpdateStatus(ids, status);

    // 如果是 revoke，需要使相关授权失效
    if (status === 'revoked') {
      for (const id of ids) {
        const device = await deviceRepository.findById(id);
        if (device) {
          await this.revokeDeviceAuthorizations(id, device.userId);
        }
      }
    }

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_UPDATE_DEVICE_STATUS',
        targetType: 'device',
        targetId: null,
        details: { ids, status, count: result.count },
        ipAddress
      });
    }

    return { count: result.count };
  }

  /**
   * 批量删除设备（管理员）
   */
  async batchDelete(ids, adminId = null, ipAddress = null) {
    // 先获取设备信息，用于撤销授权
    const devices = await Promise.all(
      ids.map(id => deviceRepository.findById(id))
    );

    const result = await deviceRepository.batchDelete(ids);

    // 使相关授权失效
    for (const device of devices) {
      if (device) {
        await this.revokeDeviceAuthorizations(device.id, device.userId);
      }
    }

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_DELETE_DEVICE',
        targetType: 'device',
        targetId: null,
        details: { ids, count: result.count },
        ipAddress
      });
    }

    return { count: result.count };
  }

  /**
   * 使设备相关的授权失效
   * 通过 deviceFingerprint 匹配 Authorization 表中的记录
   */
  async revokeDeviceAuthorizations(deviceId, userId) {
    try {
      // 获取设备信息
      const device = await deviceRepository.findById(deviceId);
      if (!device) {
        return { count: 0 };
      }

      // 通过 deviceFingerprint 撤销相关授权
      const authCount = await prisma.authorization.updateMany({
        where: {
          userId,
          deviceFingerprint: device.deviceFingerprint,
          status: 'active'
        },
        data: {
          status: 'revoked',
          updatedAt: new Date()
        }
      });

      return authCount;
    } catch (error) {
      // 如果 Authorization 表不存在或没有相关字段，忽略错误
      console.warn('Failed to revoke device authorizations:', error.message);
      return { count: 0 };
    }
  }
}

module.exports = new DeviceService();

