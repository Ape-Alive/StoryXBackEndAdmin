const authorizationService = require('./authorization.service');
const priceCalculatorService = require('./priceCalculator.service');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * AI调用服务
 */
class AICallService {
  /**
   * 上报调用结果
   */
  async reportCall(callToken, requestId, inputTokens, outputTokens, totalTokens, status, errorMessage = null, duration = null, responseTime = null) {
    // 1. 验证callToken并获取授权
    const authorization = await authorizationService.getByCallToken(callToken);
    
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }

    // 验证授权状态
    if (authorization.status !== 'active') {
      throw new BadRequestError(`Authorization status is ${authorization.status}, cannot report call`);
    }

    // 验证授权是否过期
    if (new Date() > authorization.expiresAt) {
      throw new BadRequestError('Authorization has expired');
    }

    // 验证授权是否已被使用（防止重复上报）
    if (authorization.requestId) {
      throw new BadRequestError(`Authorization has already been used with requestId: ${authorization.requestId}`);
    }

    // 验证requestId是否已存在（防止重复上报）
    const existingLog = await prisma.aICallLog.findUnique({
      where: { requestId }
    });
    if (existingLog) {
      throw new BadRequestError('Request ID already exists');
    }

    const userId = authorization.userId;
    const modelId = authorization.modelId;
    const frozenQuota = parseFloat(authorization.frozenQuota);

    // 2. 计算实际费用
    let actualCost = 0;
    if (status === 'success') {
      const costInfo = await priceCalculatorService.calculateActualCost(
        modelId,
        userId,
        inputTokens,
        outputTokens
      );
      actualCost = costInfo.cost;
    }

    // 3. 结算额度
    let refundedQuota = 0;
    let additionalCost = 0;

    if (status === 'success') {
      if (actualCost < frozenQuota) {
        // 实际消耗小于预冻结，退回差额
        refundedQuota = frozenQuota - actualCost;
      } else if (actualCost > frozenQuota) {
        // 实际消耗大于预冻结，需要补充扣减
        additionalCost = actualCost - frozenQuota;
        
        // 检查可用额度是否充足
        const userQuotas = await prisma.userQuota.findMany({
          where: { userId }
        });
        
        let totalAvailable = 0;
        for (const quota of userQuotas) {
          totalAvailable += parseFloat(quota.available);
        }
        
        if (totalAvailable < additionalCost) {
          throw new BadRequestError('Insufficient quota for additional cost');
        }
      }
    } else {
      // 调用失败，释放所有预冻结额度
      refundedQuota = frozenQuota;
    }

    // 4. 使用事务处理额度结算和日志记录
    return await prisma.$transaction(async (tx) => {
      // 结算额度
      if (refundedQuota > 0) {
        // 释放预冻结额度
        const userQuotas = await tx.userQuota.findMany({
          where: { userId }
        });

        let remainingToUnfreeze = refundedQuota;
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
                reason: `Call report refund: ${requestId}`,
                requestId
              }
            });

            remainingToUnfreeze -= unfreezeAmount;
          }
        }
      }

      if (additionalCost > 0) {
        // 补充扣减额度
        const userQuotas = await tx.userQuota.findMany({
          where: { userId },
          orderBy: {
            packageId: 'asc' // null在前
          }
        });

        let remainingToDeduct = additionalCost;
        for (const quota of userQuotas) {
          if (remainingToDeduct <= 0) break;

          const available = parseFloat(quota.available);
          if (available > 0) {
            const deductAmount = Math.min(available, remainingToDeduct);
            
            await tx.userQuota.update({
              where: { id: quota.id },
              data: {
                available: { decrement: deductAmount },
                used: { increment: deductAmount }
              }
            });

            await tx.quotaRecord.create({
              data: {
                userId,
                packageId: quota.packageId,
                type: 'decrease',
                amount: deductAmount,
                before: available,
                after: available - deductAmount,
                reason: `Call report additional cost: ${requestId}`,
                requestId
              }
            });

            remainingToDeduct -= deductAmount;
          }
        }
      }

      if (status === 'success') {
        // 将预冻结转为已使用（处理actualCost为0的情况）
        const userQuotas = await tx.userQuota.findMany({
          where: { userId }
        });

        // 如果actualCost为0，释放所有预冻结额度
        if (actualCost === 0) {
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
                  reason: `Call report refund (zero cost): ${requestId}`,
                  requestId
                }
              });

              remainingToUnfreeze -= unfreezeAmount;
            }
          }
        } else if (actualCost > 0) {
          // 将预冻结转为已使用
          let remainingToUse = Math.min(actualCost, frozenQuota);
          for (const quota of userQuotas) {
            if (remainingToUse <= 0) break;

            const frozen = parseFloat(quota.frozen);
            if (frozen > 0) {
              const useAmount = Math.min(frozen, remainingToUse);
              
              await tx.userQuota.update({
                where: { id: quota.id },
                data: {
                  frozen: { decrement: useAmount },
                  used: { increment: useAmount }
                }
              });

              await tx.quotaRecord.create({
                data: {
                  userId,
                  packageId: quota.packageId,
                  type: 'decrease',
                  amount: useAmount,
                  before: frozen,
                  after: frozen - useAmount,
                  reason: `Call report usage: ${requestId}`,
                  requestId
                }
              });

              remainingToUse -= useAmount;
            }
          }
        }
      }

      // 记录AI调用日志
      // 注意：status字段在schema中定义为success/failure，需要转换
      const logStatus = status === 'success' ? 'success' : 'failure';
      
      const callLog = await tx.aICallLog.create({
        data: {
          userId,
          modelId,
          requestId,
          inputTokens,
          outputTokens,
          totalTokens,
          cost: actualCost,
          status: logStatus,
          errorMessage,
          duration,
          requestTime: new Date(),
          responseTime: responseTime ? new Date(responseTime) : null,
          deviceFingerprint: authorization.deviceFingerprint,
          ipAddress: authorization.ipAddress
        },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        }
      });

      // 更新授权状态为已使用
      await tx.authorization.update({
        where: { id: authorization.id },
        data: {
          status: 'used',
          requestId,
          updatedAt: new Date()
        }
      });

      // 获取剩余额度
      const userQuotas = await tx.userQuota.findMany({
        where: { userId }
      });
      let remainingQuota = 0;
      for (const quota of userQuotas) {
        remainingQuota += parseFloat(quota.available);
      }

      return {
        requestId,
        actualCost,
        frozenQuota,
        refundedQuota,
        additionalCost,
        remainingQuota
      };
    });
  }

  /**
   * 获取用户的调用日志
   */
  async getUserCallLogs(userId, filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {
      userId
    };

    if (filters.modelId) {
      where.modelId = filters.modelId;
    }

    if (filters.status) {
      // 将前端的状态映射到数据库状态（success/failure）
      // 数据库只支持 success 和 failure，其他状态都映射为 failure
      if (filters.status === 'success') {
        where.status = 'success';
      } else {
        // failed, failure, timeout, error 都映射为 failure
        where.status = 'failure';
      }
    }

    if (filters.startDate || filters.endDate) {
      where.requestTime = {};
      if (filters.startDate) {
        where.requestTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.requestTime.lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.aICallLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          requestTime: 'desc'
        },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        }
      }),
      prisma.aICallLog.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 获取调用日志详情
   */
  async getCallLogDetail(requestId, userId) {
    const log = await prisma.aICallLog.findUnique({
      where: { requestId },
      include: {
        model: {
          include: {
            provider: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!log) {
      throw new NotFoundError('Call log not found');
    }

    // 验证日志属于当前用户
    if (log.userId !== userId) {
      throw new ForbiddenError('Call log does not belong to user');
    }

    return log;
  }
}

module.exports = new AICallService();
