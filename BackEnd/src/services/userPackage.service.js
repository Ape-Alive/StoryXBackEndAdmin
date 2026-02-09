const userPackageRepository = require('../repositories/userPackage.repository');
const packageRepository = require('../repositories/package.repository');
const userApiKeyService = require('./userApiKey.service');
const packageExpirationService = require('./packageExpiration.service');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { calculateDays, calculateExpiryDate } = require('../utils/packageDuration');
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
    if (pkg.duration && pkg.durationUnit && !data.expiresAt && !data.packageDuration) {
      // 根据套餐的 duration 和 durationUnit 计算天数
      const days = calculateDays(pkg.duration, pkg.durationUnit);
      if (days !== null) {
        data.packageDuration = days;
      }
    }

    const userPackage = await userPackageRepository.create(data);

    // 初始化用户额度（如果不存在）
    await this.initializeUserQuota(data.userId, data.packageId, pkg);

    // 自动创建API Key（如果提供商支持）
    try {
      await this.createApiKeysForPackage(data.userId, data.packageId, pkg);
    } catch (error) {
      // API Key创建失败不影响套餐绑定，只记录日志
      const logger = require('../utils/logger');
      logger.warn(`Failed to create API keys for package ${data.packageId}:`, error);
    }

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
   * 为套餐创建API Key（自动创建）
   */
  async createApiKeysForPackage(userId, packageId, pkg) {
    // 获取套餐关联的模型列表
    let modelIds = [];
    if (pkg.availableModels) {
      try {
        const models = JSON.parse(pkg.availableModels);
        if (Array.isArray(models)) {
          modelIds = models;
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    // 如果套餐没有指定模型，获取所有活跃模型
    if (modelIds.length === 0) {
      const allModels = await prisma.aIModel.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      modelIds = allModels.map(m => m.id);
    }

    const logger = require('../utils/logger');
    
    if (modelIds.length === 0) {
      logger.warn(`No models found for package ${packageId}, skipping API key creation`);
      return; // 没有可用模型，不创建API Key
    }

    logger.info(`Found ${modelIds.length} models for package ${packageId}, fetching providers...`);

    // 获取模型所属的提供商（去重）
    const models = await prisma.aIModel.findMany({
      where: {
        id: { in: modelIds },
        isActive: true
      },
      include: {
        provider: true
      }
    });

    if (models.length === 0) {
      logger.warn(`No active models found for package ${packageId}, skipping API key creation`);
      return;
    }

    const providers = new Map();
    models.forEach(model => {
      if (model.provider && !providers.has(model.providerId)) {
        providers.set(model.providerId, model.provider);
      }
    });

    if (providers.size === 0) {
      logger.warn(`No providers found for package ${packageId}, skipping API key creation`);
      return;
    }

    // 为每个支持创建API Key的提供商创建API Key
    logger.info(`Creating API keys for package ${packageId}, user ${userId}, found ${providers.size} providers`);

    for (const [providerId, provider] of providers) {
      logger.debug(`Checking provider ${providerId} (${provider.name}): supportsApiKeyCreation=${provider.supportsApiKeyCreation}, mainAccountToken=${provider.mainAccountToken ? 'exists' : 'missing'}`);

      if (provider.supportsApiKeyCreation) {
        try {
          logger.info(`Creating API key for provider ${providerId} (${provider.name})`);
          const result = await userApiKeyService.createSystemApiKeyForPackage(userId, packageId, providerId);
          if (result) {
            logger.info(`Successfully created API key for provider ${providerId} (${provider.name}), API Key ID: ${result.id}`);
          } else {
            logger.warn(`API key creation returned null for provider ${providerId} (${provider.name})`);
          }
        } catch (error) {
          // 单个提供商创建失败不影响其他提供商，只记录日志
          logger.error(`Failed to create API key for provider ${providerId} (${provider.name}):`, error);
        }
      } else {
        logger.debug(`Skipping provider ${providerId} (${provider.name}) - does not support API key creation`);
      }
    }
    
    logger.info(`Finished processing API key creation for package ${packageId}, user ${userId}`);
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

      // 记录额度增加流水（即使额度为0也记录，用于追踪套餐分配历史）
      await prisma.quotaRecord.create({
        data: {
          userId,
          packageId,
          type: 'increase',
          amount: quotaAmount,
          before: 0,
          after: quotaAmount,
          reason: `Package assigned: ${pkg.displayName || pkg.name}${quotaAmount > 0 ? ` (quota: ${quotaAmount})` : ' (no quota)'}`
        }
      });
    } else {
      // 如果额度已存在，可能是重复分配套餐，也应该记录流水
      const quotaAmount = pkg.quota ? parseFloat(pkg.quota) : 0;
      const before = parseFloat(existing.available);
      const after = before + quotaAmount;
      
      if (quotaAmount > 0) {
        // 更新额度
        await prisma.userQuota.update({
          where: { id: existing.id },
          data: {
            available: after
          }
        });

        // 记录额度增加流水
        await prisma.quotaRecord.create({
          data: {
            userId,
            packageId,
            type: 'increase',
            amount: quotaAmount,
            before,
            after,
            reason: `Package reassigned: ${pkg.displayName || pkg.name} (quota: ${quotaAmount})`
          }
        });
      } else {
        // 即使额度为0，也记录套餐分配流水
        await prisma.quotaRecord.create({
          data: {
            userId,
            packageId,
            type: 'increase',
            amount: 0,
            before,
            after,
            reason: `Package reassigned: ${pkg.displayName || pkg.name} (no quota)`
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

    // 同步更新关联的API Key过期时间
    try {
      const userApiKeyRepository = require('../repositories/userApiKey.repository');
      const newExpireTime = updated.expiresAt 
        ? Math.floor(updated.expiresAt.getTime() / 1000) 
        : 0; // 如果套餐永久有效，API Key也设为永久（0表示永不过期）
      
      const updateResult = await userApiKeyRepository.updateExpireTimeByPackage(
        userPackage.userId,
        userPackage.packageId,
        newExpireTime
      );
      
      const logger = require('../utils/logger');
      logger.info(`Extended package ${id} by ${days} days, updated ${updateResult.count} API keys`);
      
      // 如果API Key之前是过期状态，延期后需要重新激活
      if (updateResult.count > 0 && newExpireTime > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (newExpireTime > now) {
          // 如果新的过期时间在未来，将已过期的API Key重新激活
          await prisma.userApiKey.updateMany({
            where: {
              userId: userPackage.userId,
              packageId: userPackage.packageId,
              status: 'expired',
              expireTime: newExpireTime
            },
            data: {
              status: 'active'
            }
          });
        }
      }
    } catch (error) {
      // API Key更新失败不影响套餐延期，只记录日志
      const logger = require('../utils/logger');
      logger.error(`Failed to update API key expiry for package ${id}:`, error);
    }

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

    // 删除前先清理相关资源（清零额度、禁用API Key）
    try {
      await packageExpirationService.handlePackageDeletion(userPackage.userId, userPackage.packageId);
    } catch (error) {
      // 清理失败不影响删除，只记录日志
      const logger = require('../utils/logger');
      logger.error(`Failed to clean up resources for user package ${id}:`, error);
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
  async getAvailablePackages(type = null, durationUnit = null) {
    const where = {
      isActive: true
    };

    if (type) {
      where.type = type;
    }

    // 按有效期单位筛选
    if (durationUnit) {
      if (durationUnit === 'permanent') {
        // 永久套餐：duration 和 durationUnit 都为 null
        where.duration = null;
        where.durationUnit = null;
      } else if (['day', 'month', 'year'].includes(durationUnit)) {
        // 指定单位的套餐
        where.durationUnit = durationUnit;
      }
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
    if (pkg.duration && pkg.durationUnit) {
      expiresAt = calculateExpiryDate(pkg.duration, pkg.durationUnit);
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
    let renewalDays = days;
    if (!renewalDays && pkg.duration && pkg.durationUnit) {
      renewalDays = calculateDays(pkg.duration, pkg.durationUnit);
    }
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

    // 删除前先清理相关资源（清零额度、禁用API Key）
    try {
      await packageExpirationService.handlePackageDeletion(userId, userPackage.packageId);
    } catch (error) {
      // 清理失败不影响删除，只记录日志
      const logger = require('../utils/logger');
      logger.error(`Failed to clean up resources for user package ${id}:`, error);
    }

    await userPackageRepository.delete(id);

    // 记录操作日志（终端用户操作，暂时不记录到 OperationLog）

    return { success: true };
  }
}

module.exports = new UserPackageService();
