const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * 授权清理服务
 * 用于清理过期授权并释放预冻结的额度
 */
class AuthorizationCleanupService {
  /**
   * 清理过期授权并释放额度
   */
  async cleanupExpiredAuthorizations() {
    const now = new Date();
    
    // 查找所有过期且状态为active的授权
    const expiredAuthorizations = await prisma.authorization.findMany({
      where: {
        status: 'active',
        expiresAt: {
          lt: now
        }
      },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });

    if (expiredAuthorizations.length === 0) {
      logger.info('No expired authorizations to cleanup');
      return { cleaned: 0, refundedQuota: 0 };
    }

    let totalRefunded = 0;
    let cleaned = 0;
    const errors = [];

    for (const authorization of expiredAuthorizations) {
      try {
        const frozenQuota = parseFloat(authorization.frozenQuota);
        
        if (frozenQuota > 0) {
          // 使用事务释放额度并更新授权状态
          await prisma.$transaction(async (tx) => {
            // 获取用户额度
            const userQuotas = await tx.userQuota.findMany({
              where: { userId: authorization.userId }
            });

            // 释放预冻结的额度
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
                    userId: authorization.userId,
                    packageId: quota.packageId,
                    type: 'unfreeze',
                    amount: unfreezeAmount,
                    before: frozen,
                    after: frozen - unfreezeAmount,
                    reason: `Expired authorization cleanup: ${authorization.id}`
                  }
                });

                remainingToUnfreeze -= unfreezeAmount;
              }
            }

            // 更新授权状态为expired
            await tx.authorization.update({
              where: { id: authorization.id },
              data: {
                status: 'expired',
                updatedAt: new Date()
              }
            });
          });

          totalRefunded += frozenQuota;
        } else {
          // 即使没有冻结额度，也要更新状态
          await prisma.authorization.update({
            where: { id: authorization.id },
            data: {
              status: 'expired',
              updatedAt: new Date()
            }
          });
        }

        cleaned++;
      } catch (error) {
        logger.error(`Failed to cleanup authorization ${authorization.id}:`, error);
        errors.push({
          authorizationId: authorization.id,
          error: error.message
        });
      }
    }

    logger.info(`Authorization cleanup completed: ${cleaned} cleaned, ${totalRefunded} quota refunded`);

    return {
      cleaned,
      refundedQuota: totalRefunded,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 获取过期授权统计
   */
  async getExpiredAuthorizationStats() {
    const now = new Date();
    
    const stats = await prisma.authorization.groupBy({
      by: ['status'],
      where: {
        expiresAt: {
          lt: now
        }
      },
      _count: true
    });

    const totalExpired = await prisma.authorization.count({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    const totalFrozenQuota = await prisma.authorization.aggregate({
      where: {
        status: 'active',
        expiresAt: {
          lt: now
        }
      },
      _sum: {
        frozenQuota: true
      }
    });

    return {
      stats,
      totalExpired,
      totalFrozenQuota: totalFrozenQuota._sum.frozenQuota || 0
    };
  }
}

module.exports = new AuthorizationCleanupService();
