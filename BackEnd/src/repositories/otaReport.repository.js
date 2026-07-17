const prisma = require('../config/database')

class OtaReportRepository {
  async create(data) {
    return prisma.otaReport.create({ data })
  }

  async findMany(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize
    const where = {}

    if (filters.deviceId) where.deviceId = filters.deviceId
    if (filters.event) where.event = filters.event
    if (filters.layer) where.layer = filters.layer

    const [data, total] = await Promise.all([
      prisma.otaReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.otaReport.count({ where }),
    ])

    return { data, total, page, pageSize }
  }
}

module.exports = new OtaReportRepository()
