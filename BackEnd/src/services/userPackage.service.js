const userPackageRepository = require('../repositories/userPackage.repository');
const packageRepository = require('../repositories/package.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * 用户套餐业务逻辑层
 */
class UserPackageService {
  /**
   * 获取用户套餐列表
   */
  async getUserPackages(filters = {}, pagination = {}) {
    return await userPackageRepository.findUserPackages(filters, pagination);
  }

  /**
   * 获取用户套餐详情
   */
  async getUserPackageDetail(id) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }
    return userPackage;
  }

  /**
   * 分配套餐给用户
   */
  async assignPackage(data, adminId = null, ipAddress = null) {
    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: data.userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 验证套餐是否存在
    const pkg = await packageRepository.findById(data.packageId);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // 检查用户是否已有该套餐
    const existing = await userPackageRepository.findByUserAndPackage(data.userId, data.packageId);
    if (existing) {
      throw new ConflictError('User already has this package');
    }

    // 如果套餐不可叠加，检查用户是否已有套餐
    if (!pkg.isStackable) {
      const userPackages = await userPackageRepository.findActiveUserPackages(data.userId);
      if (userPackages.length > 0) {
        throw new ConflictError('Package is not stackable and user already has a package');
      }
    }

    // 使用套餐的默认时长
    if (pkg.duration && !data.expiresAt && !data.packageDuration) {
      data.packageDuration = pkg.duration;
    }

    const userPackage = await userPackageRepository.create(data);

    // 初始化用户额度（如果不存在）
    await this.initializeUserQuota(data.userId, data.packageId, pkg);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'ASSIGN_PACKAGE',
        targetType: 'user_package',
        targetId: userPackage.id,
        details: { userId: data.userId, packageId: data.packageId },
        ipAddress
      });
    }

    return userPackage;
  }

  /**
   * 初始化用户额度
   */
  async initializeUserQuota(userId, packageId, pkg) {
    const existing = await prisma.userQuota.findFirst({
      where: {
        userId,
        packageId
      }
    });

    if (!existing) {
      await prisma.userQuota.create({
        data: {
          userId,
          packageId,
          available: pkg.totalQuota || 0,
          frozen: 0,
          used: 0
        }
      });

      // 记录额度增加流水
      if (pkg.totalQuota && parseFloat(pkg.totalQuota) > 0) {
        await prisma.quotaRecord.create({
          data: {
            userId,
            packageId,
            type: 'increase',
            amount: pkg.totalQuota,
            before: 0,
            after: pkg.totalQuota,
            reason: `Package assigned: ${pkg.name}`
          }
        });
      }
    }
  }

  /**
   * 更新用户套餐优先级
   */
  async updatePriority(id, priority, adminId = null, ipAddress = null) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }

    const updated = await userPackageRepository.update(id, { priority });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_USER_PACKAGE_PRIORITY',
        targetType: 'user_package',
        targetId: id,
        details: { priority },
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 延期套餐
   */
  async extendPackage(id, days, adminId = null, ipAddress = null) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }

    if (days <= 0) {
      throw new BadRequestError('Extension days must be positive');
    }

    const updated = await userPackageRepository.extendExpiry(id, days);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'EXTEND_USER_PACKAGE',
        targetType: 'user_package',
        targetId: id,
        details: { days, newExpiry: updated.expiresAt },
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 取消用户套餐
   */
  async cancelUserPackage(id, adminId = null, ipAddress = null) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }

    await userPackageRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CANCEL_USER_PACKAGE',
        targetType: 'user_package',
        targetId: id,
        details: { userId: userPackage.userId, packageId: userPackage.packageId },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 获取用户的活跃套餐列表
   */
  async getUserActivePackages(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return await userPackageRepository.findActiveUserPackages(userId);
  }
}

module.exports = new UserPackageService();
