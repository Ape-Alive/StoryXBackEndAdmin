const prisma = require('../config/database');
const quotaRecordRepository = require('../repositories/quotaRecord.repository');
const userApiKeyRepository = require('../repositories/userApiKey.repository');
const logger = require('../utils/logger');

/**
 * 套餐过期处理服务
 */
class PackageExpirationService {
  /**
   * 处理单个过期套餐
   * @param {string} userPackageId - 用户套餐ID
   * @returns {Promise<Object>} - 处理结果
   */
  async handleExpiredPackage(userPackageId) {
    return await prisma.$transaction(async (tx) => {
      // 1. 获取用户套餐信息
      const userPackage = await tx.userPackage.findUnique({
        where: { id: userPackageId },
        include: {
          package: true,
          user: true
        }
      });

      if (!userPackage) {
        throw new Error(`UserPackage ${userPackageId} not found`);
      }

      const { userId, packageId } = userPackage;
      const results = {
        userPackageId,
        userId,
        packageId,
        quotaCleared: false,
        apiKeysDisabled: 0
      };

      // 2. 清零该套餐的额度
      const quota = await tx.userQuota.findFirst({
        where: {
          userId,
          packageId
        }
      });

      if (quota) {
        const beforeAvailable = parseFloat(quota.available);
        const beforeFrozen = parseFloat(quota.frozen);
        const totalToClear = beforeAvailable + beforeFrozen;

        if (totalToClear > 0) {
          // 清零 available 和 frozen
          await tx.userQuota.update({
            where: { id: quota.id },
            data: {
              available: 0,
              frozen: 0
              // used 保留，用于历史记录
            }
          });

          // 记录额度流水
          if (beforeAvailable > 0) {
            await tx.quotaRecord.create({
              data: {
                userId,
                packageId,
                type: 'decrease',
                amount: beforeAvailable,
                before: beforeAvailable,
                after: 0,
                reason: `Package expired: ${userPackage.package.displayName || userPackage.package.name}`
              }
            });
          }

          if (beforeFrozen > 0) {
            // 先记录解冻
            await tx.quotaRecord.create({
              data: {
                userId,
                packageId,
                type: 'unfreeze',
                amount: beforeFrozen,
                before: beforeFrozen,
                after: 0,
                reason: `Package expired: unfreeze frozen quota`
              }
            });

            // 再记录清零
            await tx.quotaRecord.create({
              data: {
                userId,
                packageId,
                type: 'decrease',
                amount: beforeFrozen,
                before: beforeFrozen,
                after: 0,
                reason: `Package expired: clear frozen quota`
              }
            });
          }

          results.quotaCleared = true;
          results.quotaClearedAmount = totalToClear;
        }
      }

      // 3. 禁用该套餐关联的API Key
      const apiKeys = await tx.userApiKey.findMany({
        where: {
          userId,
          packageId,
          status: 'active'
        }
      });

      if (apiKeys.length > 0) {
        await tx.userApiKey.updateMany({
          where: {
            userId,
            packageId,
            status: 'active'
          },
          data: {
            status: 'expired'
          }
        });

        results.apiKeysDisabled = apiKeys.length;
      }

      return results;
    });
  }

  /**
   * 批量处理过期套餐
   * @param {number} batchSize - 每批处理数量
   * @returns {Promise<Object>} - 处理结果统计
   */
  async handleExpiredPackages(batchSize = 100) {
    const now = new Date();
    let processed = 0;
    let errors = 0;
    const errorDetails = [];

    // 查找所有过期且未处理的套餐
    const expiredPackages = await prisma.userPackage.findMany({
      where: {
        expiresAt: {
          not: null,
          lte: now
        }
      },
      take: batchSize,
      orderBy: {
        expiresAt: 'asc'
      }
    });

    logger.info(`Found ${expiredPackages.length} expired packages to process`);

    for (const userPackage of expiredPackages) {
      try {
        await this.handleExpiredPackage(userPackage.id);
        processed++;
      } catch (error) {
        errors++;
        errorDetails.push({
          userPackageId: userPackage.id,
          error: error.message
        });
        logger.error(`Failed to handle expired package ${userPackage.id}:`, error);
      }
    }

    return {
      total: expiredPackages.length,
      processed,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    };
  }

  /**
   * 处理删除用户套餐时的资源清理
   * @param {string} userId - 用户ID
   * @param {string} packageId - 套餐ID
   * @returns {Promise<Object>} - 处理结果
   */
  async handlePackageDeletion(userId, packageId) {
    return await prisma.$transaction(async (tx) => {
      const results = {
        userId,
        packageId,
        quotaCleared: false,
        apiKeysDisabled: 0
      };

      // 1. 清零该套餐的额度
      const quota = await tx.userQuota.findFirst({
        where: {
          userId,
          packageId
        }
      });

      if (quota) {
        const beforeAvailable = parseFloat(quota.available);
        const beforeFrozen = parseFloat(quota.frozen);
        const totalToClear = beforeAvailable + beforeFrozen;

        if (totalToClear > 0) {
          // 清零 available 和 frozen
          await tx.userQuota.update({
            where: { id: quota.id },
            data: {
              available: 0,
              frozen: 0
            }
          });

          // 记录额度流水
          if (beforeAvailable > 0) {
            await tx.quotaRecord.create({
              data: {
                userId,
                packageId,
                type: 'decrease',
                amount: beforeAvailable,
                before: beforeAvailable,
                after: 0,
                reason: `User package deleted: clear available quota`
              }
            });
          }

          if (beforeFrozen > 0) {
            // 先记录解冻
            await tx.quotaRecord.create({
              data: {
                userId,
                packageId,
                type: 'unfreeze',
                amount: beforeFrozen,
                before: beforeFrozen,
                after: 0,
                reason: `User package deleted: unfreeze frozen quota`
              }
            });

            // 再记录清零
            await tx.quotaRecord.create({
              data: {
                userId,
                packageId,
                type: 'decrease',
                amount: beforeFrozen,
                before: beforeFrozen,
                after: 0,
                reason: `User package deleted: clear frozen quota`
              }
            });
          }

          results.quotaCleared = true;
          results.quotaClearedAmount = totalToClear;
        }

        // 删除额度记录（套餐已删除，对应的额度记录也应该删除）
        await tx.userQuota.delete({
          where: { id: quota.id }
        });
        results.quotaDeleted = true;
      }

      // 2. 禁用该套餐关联的API Key
      const apiKeys = await tx.userApiKey.findMany({
        where: {
          userId,
          packageId,
          status: 'active'
        }
      });

      if (apiKeys.length > 0) {
        await tx.userApiKey.updateMany({
          where: {
            userId,
            packageId,
            status: 'active'
          },
          data: {
            status: 'revoked',
            packageId: null // 解除套餐关联
          }
        });

        results.apiKeysDisabled = apiKeys.length;
      }

      return results;
    });
  }
}

module.exports = new PackageExpirationService();
