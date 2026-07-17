const prisma = require('../config/database')

class ActivationCodeRepository {
  async findById(id) {
    return prisma.activationCode.findFirst({
      where: { id, deletedAt: null },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            isActive: true,
          },
        },
        usedByUser: {
          select: { id: true, email: true, phone: true },
        },
      },
    })
  }

  async findByCode(code) {
    return prisma.activationCode.findFirst({
      where: { code, deletedAt: null },
      include: {
        package: true,
      },
    })
  }

  async list(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize
    const where = { deletedAt: null }

    if (filters.status) where.status = filters.status
    if (filters.packageId) where.packageId = filters.packageId
    if (filters.createdBy) where.createdBy = filters.createdBy
    if (filters.batchId) where.batchId = filters.batchId
    if (filters.keyword) {
      const kw = String(filters.keyword).trim()
      where.OR = [
        { code: { contains: kw } },
        { email: { contains: kw } },
        { phone: { contains: kw } },
        { remark: { contains: kw } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.activationCode.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              displayName: true,
              type: true,
            },
          },
          usedByUser: {
            select: { id: true, email: true, phone: true },
          },
        },
      }),
      prisma.activationCode.count({ where }),
    ])

    return { data, total, page, pageSize }
  }

  async createMany(rows) {
    return prisma.activationCode.createMany({ data: rows })
  }

  async update(id, data) {
    return prisma.activationCode.update({
      where: { id },
      data,
      include: {
        package: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
          },
        },
      },
    })
  }

  async softDelete(id) {
    return prisma.activationCode.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'revoked',
      },
    })
  }

  async expireUnusedBefore(now = new Date()) {
    return prisma.activationCode.updateMany({
      where: {
        deletedAt: null,
        status: 'unused',
        expiresAt: { lt: now },
      },
      data: {
        status: 'expired',
        deletedAt: now,
      },
    })
  }
}

module.exports = new ActivationCodeRepository()
