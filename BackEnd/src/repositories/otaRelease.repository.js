const prisma = require('../config/database')

class OtaReleaseRepository {
  buildWhere(filters = {}) {
    const where = { deletedAt: null }

    if (filters.layer) where.layer = filters.layer
    if (filters.platform) where.platform = filters.platform
    if (filters.channel) where.channel = filters.channel
    if (filters.bundleType) where.bundleType = filters.bundleType
    if (filters.isPublished !== undefined && filters.isPublished !== '') {
      where.isPublished = filters.isPublished === true || filters.isPublished === 'true'
    }
    if (filters.keyword) {
      const kw = String(filters.keyword).trim()
      if (kw) {
        where.OR = [
          { version: { contains: kw } },
          { downloadUrl: { contains: kw } },
        ]
      }
    }

    return where
  }

  async findMany(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize
    const where = this.buildWhere(filters)

    const [data, total] = await Promise.all([
      prisma.otaRelease.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ buildNumber: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.otaRelease.count({ where }),
    ])

    return { data, total, page, pageSize }
  }

  async findById(id) {
    return prisma.otaRelease.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async create(data) {
    return prisma.otaRelease.create({ data })
  }

  async update(id, data) {
    return prisma.otaRelease.update({ where: { id }, data })
  }

  async softDelete(id) {
    return prisma.otaRelease.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    })
  }

  async findLatestPublished({ layer, platform, channel, bundleType, minBuildNumber = 0, now = new Date() }) {
    const rows = await this.findPublishedCandidates({
      layer,
      platform,
      channel,
      bundleType,
      minBuildNumber,
      now,
      take: 1,
    })
    return rows[0] || null
  }

  /**
   * 按 buildNumber 降序取出已生效候选，供 targeting 失败时回退
   */
  async findPublishedCandidates({
    layer,
    platform,
    channel,
    bundleType,
    minBuildNumber = 0,
    now = new Date(),
    take = 20,
  }) {
    const where = {
      deletedAt: null,
      isPublished: true,
      layer,
      channel,
      buildNumber: { gt: minBuildNumber },
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    }
    if (platform) where.platform = platform
    if (bundleType) where.bundleType = bundleType

    return prisma.otaRelease.findMany({
      where,
      orderBy: { buildNumber: 'desc' },
      take: Math.min(Math.max(Number(take) || 20, 1), 50),
    })
  }

  async updateIfUnpublished(id, data) {
    const result = await prisma.otaRelease.updateMany({
      where: { id, deletedAt: null, isPublished: false },
      data,
    })
    if (result.count === 0) return null
    return this.findById(id)
  }
}

module.exports = new OtaReleaseRepository()
