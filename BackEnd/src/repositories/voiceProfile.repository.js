const prisma = require('../config/database')
const { mergeWhereWithRoleVisibility } = require('../utils/catalogRoleBinding')

/**
 * 音色数据访问层
 */
class VoiceProfileRepository {
  async findVoiceProfiles(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}, roleVisibilityWhere = null) {
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize

    const where = {}

    if (filters.voiceId) where.voiceId = { contains: filters.voiceId }
    if (filters.name) where.name = { contains: filters.name }
    if (filters.scope) where.scope = filters.scope
    if (filters.userId !== undefined) where.userId = filters.userId
    if (filters.modelId !== undefined) {
      where.models = { some: { modelId: filters.modelId } }
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true
    }

    const mergedWhere = mergeWhereWithRoleVisibility(where, roleVisibilityWhere)

    const orderBy = {}
    if (sort.createdAt) orderBy.createdAt = sort.createdAt
    else orderBy.createdAt = 'desc'

    const [data, total] = await Promise.all([
      prisma.voiceProfile.findMany({
        where: mergedWhere,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: true,
          models: {
            include: {
              model: { include: { provider: true } }
            }
          }
        },
      }),
      prisma.voiceProfile.count({ where: mergedWhere }),
    ])

    return { data, total, page, pageSize }
  }

  async findById(id) {
    return prisma.voiceProfile.findUnique({
      where: { id },
      include: {
        user: true,
        models: { include: { model: { include: { provider: true } } } },
      },
    })
  }

  async findByVoiceId(voiceId) {
    return prisma.voiceProfile.findUnique({ where: { voiceId } })
  }

  async create(data) {
    return prisma.voiceProfile.create({ data })
  }

  async update(id, data, tx = null) {
    const db = tx || prisma
    return db.voiceProfile.update({ where: { id }, data })
  }

  async delete(id) {
    return prisma.voiceProfile.delete({ where: { id } })
  }

  /**
   * 克隆音色在 meta JSON 中记录 userApiKeyId（与 UserApiKey.id 对应）
   */
  _metaMarkerForCloneUserApiKey(userApiKeyId) {
    return { contains: `"userApiKeyId":"${userApiKeyId}"` }
  }

  async countClonedVoicesByUserApiKeyId(userApiKeyId) {
    if (!userApiKeyId || typeof userApiKeyId !== 'string' || !/^[a-z0-9]+$/i.test(userApiKeyId)) {
      return 0
    }
    return prisma.voiceProfile.count({
      where: { meta: this._metaMarkerForCloneUserApiKey(userApiKeyId) },
    })
  }

  async findClonedVoicesByUserApiKeyId(userApiKeyId, { page = 1, pageSize = 20 } = {}) {
    if (!userApiKeyId || typeof userApiKeyId !== 'string' || !/^[a-z0-9]+$/i.test(userApiKeyId)) {
      return { data: [], total: 0, page, pageSize }
    }
    const skip = (page - 1) * pageSize
    const where = { meta: this._metaMarkerForCloneUserApiKey(userApiKeyId) }
    const [data, total] = await Promise.all([
      prisma.voiceProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          models: {
            include: {
              model: { select: { id: true, name: true, displayName: true } },
            },
          },
        },
      }),
      prisma.voiceProfile.count({ where }),
    ])
    return { data, total, page, pageSize }
  }
}

module.exports = new VoiceProfileRepository()

