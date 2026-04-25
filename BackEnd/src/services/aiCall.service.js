const authorizationService = require('./authorization.service');
const priceCalculatorService = require('./priceCalculator.service');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * AI调用服务
 */
class AICallService {
  normalizeUserModelCallLog(log) {
    return {
      ...log,
      logType: 'model_call',
      logTypeLabel: '模型调用'
    }
  }

  normalizeUserVoiceCloneLog(log) {
    let metaObj = null
    if (log.meta) {
      try {
        metaObj = JSON.parse(log.meta)
      } catch {
        metaObj = null
      }
    }
    const modelId = metaObj?.modelId || log.voiceProfile?.models?.[0]?.modelId || null

    return {
      id: log.id,
      requestId: `voice_clone:${log.id}`,
      userId: log.actorUserId,
      modelId,
      model: log.voiceProfile?.models?.[0]?.model || null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      cost: log.amountCharged,
      status: 'success',
      errorMessage: null,
      requestTime: log.createdAt,
      responseTime: log.createdAt,
      duration: null,
      deviceFingerprint: null,
      ipAddress: null,
      logType: 'voice_clone',
      logTypeLabel: '声音复刻',
      cloneStatus: log.status,
      voiceId: log.voiceId,
      voiceProfileId: log.voiceProfileId,
      userApiKeyId: log.userApiKeyId,
      amountCharged: log.amountCharged,
      usedCreditsBefore: log.usedCreditsBefore,
      usedCreditsAfter: log.usedCreditsAfter
    }
  }

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
    let pricingType = null;
    if (status === 'success') {
      const costInfo = await priceCalculatorService.calculateActualCost(
        modelId,
        userId,
        inputTokens,
        outputTokens
      );
      actualCost = costInfo.cost;
      pricingType = costInfo.price?.pricingType || null;

      // 基础防护：成功调用时，token/char 计费必须上报非 0 消耗，避免 0 成本结算
      if (pricingType === 'token') {
        const total = (Number(inputTokens) || 0) + (Number(outputTokens) || 0);
        if (total <= 0) {
          throw new BadRequestError('Token pricing requires non-zero inputTokens/outputTokens when status=success');
        }
      }
      if (pricingType === 'char') {
        const total = (Number(inputTokens) || 0) + (Number(outputTokens) || 0);
        if (total <= 0) {
          throw new BadRequestError('Char pricing requires non-zero inputChars/outputChars when status=success');
        }
      }
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

      // 结算上游 API Key 额度（扣减选中的那一个 API Key）
      if (status === 'success' && actualCost > 0 && authorization.userApiKeyId) {
        const apiKey = await tx.userApiKey.findUnique({
          where: { id: authorization.userApiKeyId }
        });
        if (apiKey) {
          const credits = Number(apiKey.credits) || 0;
          const used = Number(apiKey.usedCredits) || 0;
          if (credits > 0) {
            const remaining = credits - used;
            if (remaining < actualCost) {
              throw new BadRequestError('Insufficient API key credits for this call');
            }
          }
          await tx.userApiKey.update({
            where: { id: apiKey.id },
            data: {
              usedCredits: { increment: actualCost }
            }
          });
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
    const logType = filters.logType || 'all'

    const modelWhere = { userId }
    const cloneWhere = { actorUserId: userId }

    if (filters.modelId) {
      modelWhere.modelId = filters.modelId;
      cloneWhere.meta = { contains: `"modelId":"${filters.modelId}"` }
    }

    if (filters.status) {
      // 将前端的状态映射到数据库状态（success/failure）
      // 数据库只支持 success 和 failure，其他状态都映射为 failure
      if (filters.status === 'success') {
        modelWhere.status = 'success';
      } else {
        // failed, failure, timeout, error 都映射为 failure
        modelWhere.status = 'failure';
        // 声音复刻日志当前只记录成功事件，失败态不返回
        cloneWhere.id = '__no_match__'
      }
    }

    if (filters.startDate || filters.endDate) {
      modelWhere.requestTime = {};
      cloneWhere.createdAt = {}
      if (filters.startDate) {
        modelWhere.requestTime.gte = new Date(filters.startDate);
        cloneWhere.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        modelWhere.requestTime.lte = new Date(filters.endDate);
        cloneWhere.createdAt.lte = new Date(filters.endDate)
      }
    }

    if (logType === 'model_call') {
      const [data, total] = await Promise.all([
        prisma.aICallLog.findMany({
          where: modelWhere,
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
        prisma.aICallLog.count({ where: modelWhere })
      ]);

      return {
        data: data.map((item) => this.normalizeUserModelCallLog(item)),
        total,
        page,
        pageSize
      };
    }

    if (logType === 'voice_clone') {
      const [data, total] = await Promise.all([
        prisma.voiceCloneCreditLog.findMany({
          where: cloneWhere,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            voiceProfile: {
              include: {
                models: {
                  include: {
                    model: {
                      include: {
                        provider: true
                      }
                    }
                  }
                }
              }
            }
          }
        }),
        prisma.voiceCloneCreditLog.count({ where: cloneWhere })
      ])

      return {
        data: data.map((item) => this.normalizeUserVoiceCloneLog(item)),
        total,
        page,
        pageSize
      }
    }

    const needTopN = page * pageSize
    const [modelLogs, cloneLogs, modelTotal, cloneTotal] = await Promise.all([
      prisma.aICallLog.findMany({
        where: modelWhere,
        take: needTopN,
        orderBy: { requestTime: 'desc' },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        }
      }),
      prisma.voiceCloneCreditLog.findMany({
        where: cloneWhere,
        take: needTopN,
        orderBy: { createdAt: 'desc' },
        include: {
          voiceProfile: {
            include: {
              models: {
                include: {
                  model: {
                    include: {
                      provider: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.aICallLog.count({ where: modelWhere }),
      prisma.voiceCloneCreditLog.count({ where: cloneWhere })
    ])

    const data = [
      ...modelLogs.map((item) => this.normalizeUserModelCallLog(item)),
      ...cloneLogs.map((item) => this.normalizeUserVoiceCloneLog(item))
    ]
      .sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime())
      .slice(skip, skip + pageSize)

    return {
      data,
      total: modelTotal + cloneTotal,
      page,
      pageSize
    };
  }

  /**
   * 获取调用日志详情
   */
  async getCallLogDetail(requestId, userId) {
    const raw = String(requestId || '')
    if (raw.startsWith('voice_clone:')) {
      const id = raw.replace('voice_clone:', '')
      const cloneLog = await prisma.voiceCloneCreditLog.findUnique({
        where: { id },
        include: {
          voiceProfile: {
            include: {
              models: {
                include: {
                  model: {
                    include: {
                      provider: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      if (!cloneLog) {
        throw new NotFoundError('Call log not found');
      }
      if (cloneLog.actorUserId !== userId) {
        throw new ForbiddenError('Call log does not belong to user');
      }
      return this.normalizeUserVoiceCloneLog(cloneLog)
    }

    const log = await prisma.aICallLog.findUnique({
      where: { requestId: raw },
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
