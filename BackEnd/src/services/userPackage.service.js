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
      const quotaAmount = pkg.quota ? parseFloat(pkg.quota) : 0;
      await prisma.userQuota.create({
        data: {
          userId,
          packageId,
          available: quotaAmount,
          frozen: 0,
          used: 0
        }
      });

      // 记录额度增加流水
      if (quotaAmount > 0) {
        await prisma.quotaRecord.create({
          data: {
            userId,
            packageId,
            type: 'increase',
            amount: quotaAmount,
            before: 0,
            after: quotaAmount,
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

  /**
   * 获取可订阅的套餐列表（终端用户）
   */
  async getAvailablePackages(type = null) {
    const where = {
      isActive: true
    };

    if (type) {
      where.type = type;
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // 解析 availableModels
    return packages.map(pkg => {
      if (pkg.availableModels) {
        try {
          const parsed = JSON.parse(pkg.availableModels);
          pkg.availableModels = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
        } catch (e) {
          pkg.availableModels = null;
        }
      } else {
        pkg.availableModels = null;
      }
      return pkg;
    });
  }

  /**
   * 订阅套餐（终端用户）
   * 注意：付费套餐必须通过订单流程，此方法仅用于免费套餐或管理员手动分配
   */
  async subscribePackage(userId, packageId, priority = null, ipAddress = null) {
    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 验证套餐是否存在且可用
    const pkg = await packageRepository.findById(packageId);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }
    if (!pkg.isActive) {
      throw new BadRequestError('Package is not available');
    }

    // 如果是付费套餐，必须走订单流程
    if (pkg.type === 'paid' && pkg.price) {
      throw new BadRequestError('Paid packages must be purchased through the order process. Please create an order first.');
    }

    // 检查用户是否已有该套餐
    const existing = await userPackageRepository.findByUserAndPackage(userId, packageId);
    if (existing) {
      // 如果套餐可叠加，允许重复订阅（但通常不允许）
      if (!pkg.isStackable) {
        throw new ConflictError('User already has this package and it is not stackable');
      }
    }

    // 计算有效期
    let expiresAt = null;
    if (pkg.duration) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.duration);
    }

    // 创建用户套餐关系
    const userPackage = await userPackageRepository.create({
      userId,
      packageId,
      startedAt: new Date(),
      expiresAt,
      priority: priority || pkg.priority
    });

    // 初始化用户额度
    await this.initializeUserQuota(userId, packageId, pkg);

    // 记录操作日志（终端用户操作，暂时不记录到 OperationLog，因为 OperationLog 只关联 Admin）
    // 如果需要记录终端用户操作，可以创建单独的用户操作日志表

    return userPackage;
  }

  /**
   * 获取我的套餐详情（终端用户）
   */
  async getMyPackageDetail(id, userId) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }

    // 验证套餐属于当前用户
    if (userPackage.userId !== userId) {
      throw new NotFoundError('User package not found');
    }

    return userPackage;
  }

  /**
   * 续费套餐（终端用户）
   */
  async renewPackage(id, userId, days = null, ipAddress = null) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }

    // 验证套餐属于当前用户
    if (userPackage.userId !== userId) {
      throw new NotFoundError('User package not found');
    }

    // 获取套餐信息
    const pkg = await packageRepository.findById(userPackage.packageId);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // 计算续费天数
    const renewalDays = days || pkg.duration;
    if (!renewalDays) {
      throw new BadRequestError('Package has no duration, cannot renew');
    }

    // 延长有效期
    const updated = await userPackageRepository.extendExpiry(id, renewalDays);

    // 如果是叠加额度，增加用户额度
    if (pkg.isStackable && pkg.quota) {
      const quotaService = require('./quota.service');
      await quotaService.adjustQuota(
        userId,
        pkg.id,
        parseFloat(pkg.quota),
        'Package renewal',
        null, // 终端用户操作，不记录管理员ID
        ipAddress
      );
    }

    // 记录操作日志（终端用户操作，暂时不记录到 OperationLog）

    return updated;
  }

  /**
   * 取消订阅（终端用户）
   */
  async unsubscribePackage(id, userId, ipAddress = null) {
    const userPackage = await userPackageRepository.findById(id);
    if (!userPackage) {
      throw new NotFoundError('User package not found');
    }

    // 验证套餐属于当前用户
    if (userPackage.userId !== userId) {
      throw new NotFoundError('User package not found');
    }

    await userPackageRepository.delete(id);

    // 记录操作日志（终端用户操作，暂时不记录到 OperationLog）

    return { success: true };
  }
}

module.exports = new UserPackageService();
