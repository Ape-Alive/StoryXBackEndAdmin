const quotaRepository = require('../repositories/quota.repository');
const quotaRecordRepository = require('../repositories/quotaRecord.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * 额度业务逻辑层
 */
class QuotaService {
  /**
   * 获取额度列表
   */
  async getQuotas(filters = {}, pagination = {}) {
    return await quotaRepository.findQuotas(filters, pagination);
  }

  /**
   * 获取用户额度详情
   */
  async getUserQuota(userId, packageId = null) {
    const quota = await quotaRepository.findByUserAndPackage(userId, packageId);
    if (!quota) {
      throw new NotFoundError('Quota not found');
    }
    return quota;
  }

  /**
   * 获取用户的所有额度
   */
  async getUserQuotas(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return await quotaRepository.findByUser(userId);
  }

  /**
   * 验证用户是终端用户（User），不是系统用户（Admin）
   */
  async validateTerminalUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('Terminal user not found');
    }
    return user;
  }

  /**
   * 手动调整额度（管理员操作）
   */
  async adjustQuota(userId, packageId, amount, reason, adminId = null, ipAddress = null, orderId = null) {
    // 验证用户类型
    await this.validateTerminalUser(userId);

    // 获取当前额度
    let quota = await quotaRepository.findByUserAndPackage(userId, packageId);

    const before = quota ? quota.available : 0;
    const newAmount = before + amount;

    if (newAmount < 0) {
      throw new BadRequestError('Resulting quota cannot be negative');
    }

    // 更新或创建额度
    quota = await quotaRepository.upsertQuota(userId, packageId, {
      available: newAmount
    });

    // 记录流水
    const recordType = amount >= 0 ? 'increase' : 'decrease';
    await quotaRecordRepository.create({
      userId,
      packageId,
      orderId,
      type: recordType,
      amount: Math.abs(amount),
      before,
      after: newAmount,
      reason: reason || `Manual adjustment by admin`
    });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'ADJUST_QUOTA',
        targetType: 'quota',
        targetId: quota.id,
        details: { userId, packageId, amount, reason, orderId },
        ipAddress
      });
    }

    return quota;
  }

  /**
   * 冻结额度（管理员操作）
   */
  async freezeQuota(quotaId, amount, reason, adminId = null, ipAddress = null) {
    // 查询额度记录
    const quota = await quotaRepository.findById(quotaId);
    if (!quota) {
      throw new NotFoundError('Quota not found');
    }

    // 验证用户类型
    await this.validateTerminalUser(quota.userId);

    // 检查可用额度是否足够
    if (parseFloat(quota.available) < amount) {
      throw new BadRequestError('Insufficient available quota');
    }

    const beforeAvailable = parseFloat(quota.available);
    const beforeFrozen = parseFloat(quota.frozen);

    // 使用事务处理
    return await prisma.$transaction(async (tx) => {
      // 冻结额度
      const updated = await tx.userQuota.update({
        where: { id: quotaId },
        data: {
          available: {
            decrement: amount
          },
          frozen: {
            increment: amount
          }
        }
      });

      // 记录额度流水
      await tx.quotaRecord.create({
        data: {
          userId: quota.userId,
          packageId: quota.packageId,
          type: 'freeze',
          amount: amount,
          before: beforeAvailable,
          after: parseFloat(updated.available),
          reason: reason || 'Manual freeze by admin'
        }
      });

      // 记录操作日志
      if (adminId) {
        const logService = require('./log.service');
        await logService.logAdminAction({
          adminId,
          action: 'FREEZE_QUOTA',
          targetType: 'quota',
          targetId: quotaId,
          details: { userId: quota.userId, packageId: quota.packageId, amount, reason },
          ipAddress
        });
      }

      return updated;
    });
  }

  /**
   * 解冻额度（管理员操作）
   */
  async unfreezeQuota(quotaId, amount, reason, adminId = null, ipAddress = null) {
    // 查询额度记录
    const quota = await quotaRepository.findById(quotaId);
    if (!quota) {
      throw new NotFoundError('Quota not found');
    }

    // 验证用户类型
    await this.validateTerminalUser(quota.userId);

    // 检查冻结额度是否足够
    if (parseFloat(quota.frozen) < amount) {
      throw new BadRequestError('Insufficient frozen quota');
    }

    const beforeAvailable = parseFloat(quota.available);
    const beforeFrozen = parseFloat(quota.frozen);

    // 使用事务处理
    return await prisma.$transaction(async (tx) => {
      // 解冻额度
      const updated = await tx.userQuota.update({
        where: { id: quotaId },
        data: {
          available: {
            increment: amount
          },
          frozen: {
            decrement: amount
          }
        }
      });

      // 记录额度流水
      await tx.quotaRecord.create({
        data: {
          userId: quota.userId,
          packageId: quota.packageId,
          type: 'unfreeze',
          amount: amount,
          before: beforeFrozen,
          after: parseFloat(updated.frozen),
          reason: reason || 'Manual unfreeze by admin'
        }
      });

      // 记录操作日志
      if (adminId) {
        const logService = require('./log.service');
        await logService.logAdminAction({
          adminId,
          action: 'UNFREEZE_QUOTA',
          targetType: 'quota',
          targetId: quotaId,
          details: { userId: quota.userId, packageId: quota.packageId, amount, reason },
          ipAddress
        });
      }

      return updated;
    });
  }

  /**
   * 设置额度（管理员操作，直接设置值）
   */
  async setQuota(quotaId, data, adminId = null, ipAddress = null) {
    // 查询额度记录
    const quota = await quotaRepository.findById(quotaId);
    if (!quota) {
      throw new NotFoundError('Quota not found');
    }

    // 验证用户类型
    await this.validateTerminalUser(quota.userId);

    const beforeAvailable = parseFloat(quota.available);
    const beforeFrozen = parseFloat(quota.frozen);
    const beforeUsed = parseFloat(quota.used);

    const newAvailable = data.available !== undefined ? parseFloat(data.available) : beforeAvailable;
    const newFrozen = data.frozen !== undefined ? parseFloat(data.frozen) : beforeFrozen;
    const newUsed = data.used !== undefined ? parseFloat(data.used) : beforeUsed;

    // 使用事务处理
    return await prisma.$transaction(async (tx) => {
      // 更新额度
      const updated = await tx.userQuota.update({
        where: { id: quotaId },
        data: {
          available: newAvailable,
          frozen: newFrozen,
          used: newUsed
        }
      });

      // 计算变动量并记录流水
      const availableChange = newAvailable - beforeAvailable;
      if (availableChange !== 0) {
        await tx.quotaRecord.create({
          data: {
            userId: quota.userId,
            packageId: quota.packageId,
            type: availableChange > 0 ? 'increase' : 'decrease',
            amount: Math.abs(availableChange),
            before: beforeAvailable,
            after: newAvailable,
            reason: data.reason || 'Manual set quota by admin'
          }
        });
      }

      // 记录操作日志
      if (adminId) {
        const logService = require('./log.service');
        await logService.logAdminAction({
          adminId,
          action: 'SET_QUOTA',
          targetType: 'quota',
          targetId: quotaId,
          details: {
            userId: quota.userId,
            packageId: quota.packageId,
            before: { available: beforeAvailable, frozen: beforeFrozen, used: beforeUsed },
            after: { available: newAvailable, frozen: newFrozen, used: newUsed },
            reason: data.reason
          },
          ipAddress
        });
      }

      return updated;
    });
  }

  /**
   * 重置额度（管理员操作，清零）
   */
  async resetQuota(quotaId, reason, adminId = null, ipAddress = null) {
    // 查询额度记录
    const quota = await quotaRepository.findById(quotaId);
    if (!quota) {
      throw new NotFoundError('Quota not found');
    }

    // 验证用户类型
    await this.validateTerminalUser(quota.userId);

    const beforeAvailable = parseFloat(quota.available);
    const beforeFrozen = parseFloat(quota.frozen);
    const beforeUsed = parseFloat(quota.used);
    const totalBefore = beforeAvailable + beforeFrozen + beforeUsed;

    // 使用事务处理
    return await prisma.$transaction(async (tx) => {
      // 重置额度
      const updated = await tx.userQuota.update({
        where: { id: quotaId },
        data: {
          available: 0,
          frozen: 0,
          used: 0
        }
      });

      // 记录额度流水（如果有额度被清零）
      if (totalBefore > 0) {
        await tx.quotaRecord.create({
          data: {
            userId: quota.userId,
            packageId: quota.packageId,
            type: 'decrease',
            amount: totalBefore,
            before: beforeAvailable,
            after: 0,
            reason: reason || 'Manual reset quota by admin'
          }
        });
      }

      // 记录操作日志
      if (adminId) {
        const logService = require('./log.service');
        await logService.logAdminAction({
          adminId,
          action: 'RESET_QUOTA',
          targetType: 'quota',
          targetId: quotaId,
          details: {
            userId: quota.userId,
            packageId: quota.packageId,
            before: { available: beforeAvailable, frozen: beforeFrozen, used: beforeUsed },
            after: { available: 0, frozen: 0, used: 0 },
            reason
          },
          ipAddress
        });
      }

      return updated;
    });
  }

  /**
   * 批量调整额度（管理员操作）
   */
  async batchAdjustQuota(items, adminId = null, ipAddress = null) {
    const results = {
      success: [],
      failed: []
    };

    for (const item of items) {
      try {
        const quota = await quotaRepository.findById(item.quotaId);
        if (!quota) {
          results.failed.push({
            quotaId: item.quotaId,
            error: 'Quota not found'
          });
          continue;
        }

        // 验证用户类型
        await this.validateTerminalUser(quota.userId);

        const before = parseFloat(quota.available);
        const newAmount = before + parseFloat(item.amount);

        if (newAmount < 0) {
          results.failed.push({
            quotaId: item.quotaId,
            error: 'Resulting quota cannot be negative'
          });
          continue;
        }

        // 使用事务处理
        await prisma.$transaction(async (tx) => {
          const updated = await tx.userQuota.update({
            where: { id: item.quotaId },
            data: {
              available: newAmount
            }
          });

          const recordType = parseFloat(item.amount) >= 0 ? 'increase' : 'decrease';
          await tx.quotaRecord.create({
            data: {
              userId: quota.userId,
              packageId: quota.packageId,
              type: recordType,
              amount: Math.abs(parseFloat(item.amount)),
              before,
              after: newAmount,
              reason: item.reason || 'Batch adjustment by admin'
            }
          });
        });

        results.success.push({
          quotaId: item.quotaId,
          userId: quota.userId
        });
      } catch (error) {
        results.failed.push({
          quotaId: item.quotaId,
          error: error.message
        });
      }
    }

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_ADJUST_QUOTA',
        targetType: 'quota',
        targetId: null,
        details: {
          total: items.length,
          success: results.success.length,
          failed: results.failed.length,
          items
        },
        ipAddress
      });
    }

    return results;
  }

  /**
   * 批量冻结额度（管理员操作）
   */
  async batchFreezeQuota(items, adminId = null, ipAddress = null) {
    const results = {
      success: [],
      failed: []
    };

    for (const item of items) {
      try {
        await this.freezeQuota(item.quotaId, item.amount, item.reason, adminId, ipAddress);
        results.success.push({
          quotaId: item.quotaId
        });
      } catch (error) {
        results.failed.push({
          quotaId: item.quotaId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 批量解冻额度（管理员操作）
   */
  async batchUnfreezeQuota(items, adminId = null, ipAddress = null) {
    const results = {
      success: [],
      failed: []
    };

    for (const item of items) {
      try {
        await this.unfreezeQuota(item.quotaId, item.amount, item.reason, adminId, ipAddress);
        results.success.push({
          quotaId: item.quotaId
        });
      } catch (error) {
        results.failed.push({
          quotaId: item.quotaId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取额度统计信息
   */
  async getQuotaStatistics(filters = {}) {
    return await quotaRepository.getStatistics(filters);
  }

  /**
   * 导出额度数据
   */
  async exportQuotas(filters = {}, format = 'excel') {
    const result = await quotaRepository.findQuotas(filters, { page: 1, pageSize: 10000 });

    // 这里可以集成 Excel/CSV 导出库
    // 暂时返回数据，前端可以处理导出
    return {
      data: result.data,
      total: result.total,
      format
    };
  }

  /**
   * 获取使用趋势统计
   */
  async getUsageTrend(filters = {}) {
    return await quotaRecordRepository.getUsageTrend(filters);
  }

  /**
   * 获取套餐使用排行
   */
  async getPackageRanking(filters = {}) {
    return await quotaRecordRepository.getPackageRanking(filters);
  }

  /**
   * 获取用户使用排行
   */
  async getUserRanking(filters = {}) {
    return await quotaRecordRepository.getUserRanking(filters);
  }

  /**
   * 获取使用分布统计
   */
  async getUsageDistribution(filters = {}) {
    return await quotaRecordRepository.getUsageDistribution(filters);
  }

  /**
   * 获取用户详细使用统计
   */
  async getUserUsageStatistics(userId, filters = {}) {
    // 验证用户是终端用户
    await this.validateTerminalUser(userId);
    return await quotaRecordRepository.getUserUsageStatistics(userId, filters);
  }

}

module.exports = new QuotaService();
