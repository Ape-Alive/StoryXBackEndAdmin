const authorizationRepository = require('../repositories/authorization.repository');
const priceCalculatorService = require('./priceCalculator.service');
const quotaService = require('./quota.service');
const deviceService = require('./device.service');
const apiKeyCreationService = require('./apiKeyCreation.service');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * 授权业务逻辑层
 */
class AuthorizationService {
  /**
   * 获取授权记录列表
   */
  async getAuthorizations(filters = {}, pagination = {}) {
    return await authorizationRepository.findAuthorizations(filters, pagination);
  }

  /**
   * 获取授权记录详情
   */
  async getAuthorizationDetail(id) {
    const authorization = await authorizationRepository.findById(id);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }
    return authorization;
  }

  /**
   * 根据 callToken 获取授权记录
   */
  async getByCallToken(callToken) {
    const authorization = await authorizationRepository.findByCallToken(callToken);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }
    return authorization;
  }

  /**
   * 撤销授权
   */
  async revokeAuthorization(id, adminId = null, ipAddress = null) {
    const authorization = await authorizationRepository.findById(id);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }

    await authorizationRepository.revoke(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'REVOKE_AUTHORIZATION',
        targetType: 'authorization',
        targetId: id,
          details: {
            userId: authorization.userId,
            modelId: authorization.modelId,
            callToken: authorization.callToken
          },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 申请调用授权（获取AI密钥）
   */
  async requestAuthorization(userId, modelId, deviceFingerprint, estimatedTokens = 0, ipAddress = null) {
    // 0. 验证设备指纹格式和状态
    deviceService.validateDeviceFingerprint(deviceFingerprint);
    await deviceService.checkDeviceStatus(userId, deviceFingerprint);

    // 1. 验证用户状态
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.status !== 'normal') {
      throw new ForbiddenError('User account is not available');
    }

    // 2. 验证模型
    const model = await prisma.aIModel.findUnique({
      where: { id: modelId },
      include: {
        provider: true
      }
    });
    if (!model) {
      throw new NotFoundError('Model not found');
    }
    if (!model.isActive) {
      throw new BadRequestError('Model is currently unavailable');
    }
    if (!model.provider.isActive) {
      throw new BadRequestError('Service provider is currently unavailable');
    }

    // 3. 检查用户套餐权限
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

    if (userPackages.length === 0) {
      throw new ForbiddenError('No active subscription found');
    }

    // 检查套餐是否包含该模型
    let hasAccess = false;
    for (const userPackage of userPackages) {
      const availableModels = userPackage.package.availableModels 
        ? JSON.parse(userPackage.package.availableModels) 
        : null;
      
      // 如果availableModels为null或空数组，表示所有模型都可用
      if (!availableModels || availableModels.length === 0 || availableModels.includes(modelId)) {
        hasAccess = true;
        break;
      }
    }

    if (!hasAccess) {
      throw new ForbiddenError('This model is not included in your subscription');
    }

    // 4. 检查设备数量限制（使用最高优先级的套餐）
    const highestPriorityPackage = userPackages[0].package;
    if (highestPriorityPackage.maxDevices !== null) {
      const deviceCount = await prisma.device.count({
        where: {
          userId,
          status: 'active'
        }
      });
      if (deviceCount >= highestPriorityPackage.maxDevices) {
        throw new ForbiddenError(`Device limit reached. Maximum ${highestPriorityPackage.maxDevices} devices allowed`);
      }
    }

    // 5. 计算预估费用
    const costInfo = await priceCalculatorService.calculateEstimatedCost(modelId, userId, estimatedTokens);
    const estimatedCost = costInfo.cost;

    // 6. 生成callToken
    const callToken = crypto.randomBytes(32).toString('hex');

    // 7. 设置授权过期时间（默认10分钟）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 8. 使用事务创建授权并冻结额度（在事务内查询和锁定额度，防止并发问题）
    return await prisma.$transaction(async (tx) => {
      // 在事务内重新查询并锁定额度记录（使用SELECT FOR UPDATE防止并发）
      const userQuotas = await tx.userQuota.findMany({
        where: { userId },
        orderBy: {
          packageId: 'asc' // null在前，表示默认额度
        }
        // 注意：Prisma不支持SELECT FOR UPDATE，但事务本身提供了隔离性
        // 如果需要更强的并发控制，可以考虑使用数据库锁或乐观锁
      });

      // 计算总可用额度（在事务内重新计算，确保数据一致性）
      let totalAvailable = 0;
      for (const quota of userQuotas) {
        totalAvailable += parseFloat(quota.available);
      }

      if (totalAvailable < estimatedCost) {
        throw new BadRequestError('Insufficient quota');
      }

      // 预冻结额度（从优先级高的套餐开始冻结）
      let remainingToFreeze = estimatedCost;
      const freezeOperations = [];

      for (const userPackage of userPackages) {
        if (remainingToFreeze <= 0) break;

        const quota = userQuotas.find(q => q.packageId === userPackage.packageId);
        if (!quota) continue;

        const available = parseFloat(quota.available);
        if (available <= 0) continue;

        const freezeAmount = Math.min(available, remainingToFreeze);
        freezeOperations.push({
          quotaId: quota.id,
          amount: freezeAmount,
          packageId: quota.packageId
        });
        remainingToFreeze -= freezeAmount;
      }

      // 冻结额度
      for (const op of freezeOperations) {
        const quotaBefore = await tx.userQuota.findUnique({ where: { id: op.quotaId } });
        const beforeAvailable = parseFloat(quotaBefore.available);
        
        // 再次检查可用额度（防止并发问题）
        if (beforeAvailable < op.amount) {
          throw new BadRequestError('Insufficient quota');
        }

        await tx.userQuota.update({
          where: { id: op.quotaId },
          data: {
            available: { decrement: op.amount },
            frozen: { increment: op.amount }
          }
        });

        // 记录额度流水
        const quotaAfter = await tx.userQuota.findUnique({ where: { id: op.quotaId } });
        await tx.quotaRecord.create({
          data: {
            userId,
            packageId: op.packageId,
            type: 'freeze',
            amount: op.amount,
            before: beforeAvailable,
            after: parseFloat(quotaAfter.available),
            reason: `Authorization request for model ${modelId}`
          }
        });
      }

      // 创建授权记录
      const authorization = await tx.authorization.create({
        data: {
          userId,
          modelId,
          deviceFingerprint,
          ipAddress,
          frozenQuota: estimatedCost,
          callToken,
          status: 'active',
          expiresAt
        },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        }
      });

      // 更新设备最后使用时间
      try {
        await deviceService.upsertDevice(userId, deviceFingerprint, ipAddress);
      } catch (error) {
        // 设备更新失败不影响授权创建，只记录日志
        const logger = require('../utils/logger');
        logger.warn(`Failed to update device for authorization ${authorization.id}:`, error);
      }

      // 选择API Key（按优先级）
      const selectedApiKey = await apiKeyCreationService.selectApiKeyForUser(
        userId,
        model.providerId
      );

      return {
        id: authorization.id,
        callToken: authorization.callToken,
        apiKey: selectedApiKey || model.provider.mainAccountToken || null, // 返回AI密钥（优先使用用户专属API Key）
        providerBaseUrl: model.provider.baseUrl || null,
        modelBaseUrl: model.baseUrl,
        modelName: model.name,
        apiConfig: model.apiConfig,
        expiresAt: authorization.expiresAt,
        frozenQuota: parseFloat(authorization.frozenQuota),
        estimatedCost,
        maxToken: costInfo.maxToken || null, // 返回maxToken信息
        usedMaxToken: costInfo.usedMaxToken || false // 标识是否使用了maxToken
      };
    });
  }

  /**
   * 取消授权（释放预冻结额度）
   */
  async cancelAuthorization(id, userId) {
    const authorization = await authorizationRepository.findById(id);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }

    // 验证授权属于当前用户
    if (authorization.userId !== userId) {
      throw new ForbiddenError('Authorization does not belong to user');
    }

    // 验证授权状态
    if (authorization.status !== 'active') {
      throw new BadRequestError('Authorization is not active');
    }

    // 释放预冻结的额度（使用事务确保数据一致性）
    const frozenQuota = parseFloat(authorization.frozenQuota);
    
    return await prisma.$transaction(async (tx) => {
      if (frozenQuota > 0) {
        // 获取用户额度（需要找到对应的套餐）
        const userQuotas = await tx.userQuota.findMany({
          where: { userId }
        });

        // 从冻结额度中释放（简化处理：释放到第一个有冻结额度的套餐）
        let remainingToUnfreeze = frozenQuota;
        for (const quota of userQuotas) {
          if (remainingToUnfreeze <= 0) break;

          const frozen = parseFloat(quota.frozen);
          if (frozen > 0) {
            const unfreezeAmount = Math.min(frozen, remainingToUnfreeze);
            
            await tx.userQuota.update({
              where: { id: quota.id },
              data: {
                available: { increment: unfreezeAmount },
                frozen: { decrement: unfreezeAmount }
              }
            });

            await tx.quotaRecord.create({
              data: {
                userId,
                packageId: quota.packageId,
                type: 'unfreeze',
                amount: unfreezeAmount,
                before: frozen,
                after: frozen - unfreezeAmount,
                reason: `Authorization cancelled: ${authorization.id}`
              }
            });

            remainingToUnfreeze -= unfreezeAmount;
          }
        }
      }

      // 更新授权状态（在同一事务中）
      await tx.authorization.update({
        where: { id },
        data: {
          status: 'revoked',
          updatedAt: new Date()
        }
      });

      return {
        refundedQuota: frozenQuota
      };
    });
  }

  /**
   * 获取用户授权统计
   */
  async getUserAuthorizationStats(userId) {
    return await authorizationRepository.getUserAuthorizationStats(userId);
  }
}

module.exports = new AuthorizationService();
