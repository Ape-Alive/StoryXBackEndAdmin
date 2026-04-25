const prisma = require('../config/database')

/**
 * 日志服务
 */
class LogService {
  /**
   * 记录管理员操作日志
   */
  async logAdminAction(data) {
    try {
      return await prisma.operationLog.create({
        data: {
          adminId: data.adminId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId || null,
          details: typeof data.details === 'string' ? data.details : JSON.stringify(data.details),
          ipAddress: data.ipAddress || null,
          result: data.result || 'success',
          errorMessage: data.errorMessage || null,
        },
      })
    } catch (error) {
      console.error('Failed to log admin action:', error)
      // 日志记录失败不应该影响主流程
      return null
    }
  }

  /**
   * 获取管理员操作日志列表
   */
  async getOperationLogs(filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize

    const where = {}

    if (filters.adminId) where.adminId = filters.adminId
    if (filters.action) where.action = filters.action
    if (filters.targetType) where.targetType = filters.targetType
    if (filters.targetId) where.targetId = filters.targetId
    if (filters.result) where.result = filters.result

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    const [data, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.operationLog.count({ where }),
    ])

    return { data, total, page, pageSize }
  }

  buildModelCallWhere(filters = {}) {
    const where = {}
    if (filters.userId) where.userId = filters.userId
    if (filters.modelId) where.modelId = filters.modelId
    if (filters.status) where.status = filters.status
    if (filters.requestId) where.requestId = filters.requestId
    if (filters.startDate || filters.endDate) {
      where.requestTime = {}
      if (filters.startDate) where.requestTime.gte = new Date(filters.startDate)
      if (filters.endDate) where.requestTime.lte = new Date(filters.endDate)
    }
    return where
  }

  buildVoiceCloneWhere(filters = {}) {
    const where = {}
    if (filters.userId) where.actorUserId = filters.userId
    if (filters.modelId) {
      where.meta = { contains: `"modelId":"${filters.modelId}"` }
    }
    if (filters.status) {
      where.status = filters.status === 'success' ? { in: ['charged', 'no_charge_configured', 'admin_exempt'] } : '__no_match__'
    }
    if (filters.requestId) {
      const raw = String(filters.requestId)
      const cloneId = raw.startsWith('voice_clone:') ? raw.replace('voice_clone:', '') : raw
      where.id = cloneId
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }
    return where
  }

  normalizeModelCall(row) {
    return {
      ...row,
      logType: 'model_call',
      logTypeLabel: '模型调用',
    }
  }

  normalizeVoiceClone(row) {
    let metaObj = null
    if (row.meta) {
      try {
        metaObj = JSON.parse(row.meta)
      } catch {
        metaObj = null
      }
    }
    const modelId = metaObj?.modelId || null
    return {
      id: row.id,
      requestId: `voice_clone:${row.id}`,
      logType: 'voice_clone',
      logTypeLabel: '声音复刻',
      status: 'success',
      userId: row.actorUserId || null,
      user: row.actorUser
        ? { id: row.actorUser.id, email: row.actorUser.email, phone: row.actorUser.phone }
        : null,
      modelId,
      model: row.voiceProfile?.models?.[0]?.model || null,
      totalTokens: null,
      inputTokens: null,
      outputTokens: null,
      cost: row.amountCharged,
      duration: null,
      requestTime: row.createdAt,
      responseTime: row.createdAt,
      deviceFingerprint: null,
      ipAddress: null,
      errorMessage: null,
      cloneStatus: row.status,
      voiceId: row.voiceId,
      voiceProfileId: row.voiceProfileId,
      userApiKeyId: row.userApiKeyId,
      amountCharged: row.amountCharged,
      keyCreditsCap: row.keyCreditsCap,
      usedCreditsBefore: row.usedCreditsBefore,
      usedCreditsAfter: row.usedCreditsAfter,
      providerId: row.providerId,
      provider: row.provider
        ? { id: row.provider.id, name: row.provider.name, displayName: row.provider.displayName }
        : null,
      meta: row.meta,
    }
  }

  /**
   * 获取 AI/声音复刻日志列表
   */
  async getAICallLogs(filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize
    const logType = filters.logType || 'all'

    const modelWhere = this.buildModelCallWhere(filters)
    const cloneWhere = this.buildVoiceCloneWhere(filters)
    if (cloneWhere.status === '__no_match__') {
      return { data: [], total: 0, page, pageSize }
    }

    if (logType === 'model_call') {
      const [rows, total] = await Promise.all([
        prisma.aICallLog.findMany({
          where: modelWhere,
          skip,
          take: pageSize,
          orderBy: { requestTime: 'desc' },
          include: {
            user: { select: { id: true, email: true, phone: true } },
            model: {
              select: {
                id: true,
                name: true,
                displayName: true,
                provider: { select: { id: true, name: true, displayName: true } },
              },
            },
          },
        }),
        prisma.aICallLog.count({ where: modelWhere }),
      ])
      return { data: rows.map((r) => this.normalizeModelCall(r)), total, page, pageSize }
    }

    if (logType === 'voice_clone') {
      const [rows, total] = await Promise.all([
        prisma.voiceCloneCreditLog.findMany({
          where: cloneWhere,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            actorUser: { select: { id: true, email: true, phone: true } },
            provider: { select: { id: true, name: true, displayName: true } },
            voiceProfile: {
              include: {
                models: {
                  include: {
                    model: {
                      select: {
                        id: true,
                        name: true,
                        displayName: true,
                        provider: { select: { id: true, name: true, displayName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.voiceCloneCreditLog.count({ where: cloneWhere }),
      ])
      return { data: rows.map((r) => this.normalizeVoiceClone(r)), total, page, pageSize }
    }

    // all: 合并后统一分页
    const needTopN = page * pageSize
    const [modelRows, cloneRows, modelTotal, cloneTotal] = await Promise.all([
      prisma.aICallLog.findMany({
        where: modelWhere,
        take: needTopN,
        orderBy: { requestTime: 'desc' },
        include: {
          user: { select: { id: true, email: true, phone: true } },
          model: {
            select: {
              id: true,
              name: true,
              displayName: true,
              provider: { select: { id: true, name: true, displayName: true } },
            },
          },
        },
      }),
      prisma.voiceCloneCreditLog.findMany({
        where: cloneWhere,
        take: needTopN,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: { select: { id: true, email: true, phone: true } },
          provider: { select: { id: true, name: true, displayName: true } },
          voiceProfile: {
            include: {
              models: {
                include: {
                  model: {
                    select: {
                      id: true,
                      name: true,
                      displayName: true,
                      provider: { select: { id: true, name: true, displayName: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.aICallLog.count({ where: modelWhere }),
      prisma.voiceCloneCreditLog.count({ where: cloneWhere }),
    ])

    const merged = [
      ...modelRows.map((r) => this.normalizeModelCall(r)),
      ...cloneRows.map((r) => this.normalizeVoiceClone(r)),
    ]
      .sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime())
      .slice(skip, skip + pageSize)

    return { data: merged, total: modelTotal + cloneTotal, page, pageSize }
  }

  /**
   * 获取 AI/声音复刻日志详情
   */
  async getAICallLogDetail(requestId) {
    const raw = String(requestId || '')
    if (raw.startsWith('voice_clone:')) {
      const id = raw.replace('voice_clone:', '')
      const row = await prisma.voiceCloneCreditLog.findUnique({
        where: { id },
        include: {
          actorUser: { select: { id: true, email: true, phone: true } },
          provider: { select: { id: true, name: true, displayName: true } },
          voiceProfile: {
            include: {
              models: {
                include: {
                  model: {
                    select: {
                      id: true,
                      name: true,
                      displayName: true,
                      provider: { select: { id: true, name: true, displayName: true } },
                    },
                  },
                },
              },
            },
          },
        },
      })
      return row ? this.normalizeVoiceClone(row) : null
    }

    const row = await prisma.aICallLog.findUnique({
      where: { requestId: raw },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        model: {
          include: {
            provider: true,
          },
        },
      },
    })
    return row ? this.normalizeModelCall(row) : null
  }

  /**
   * 获取操作日志详情
   */
  async getOperationLogDetail(id) {
    return await prisma.operationLog.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })
  }
}

module.exports = new LogService()
