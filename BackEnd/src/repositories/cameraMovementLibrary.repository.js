const prisma = require('../config/database')
const { mergeWhereWithRoleVisibility } = require('../utils/catalogRoleBinding')

class CameraMovementLibraryRepository {
  buildWhere(filters = {}) {
    const where = {}

    if (filters.type) {
      where.type = filters.type
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === true || filters.isActive === 'true'
    }
    if (filters.keyword) {
      const kw = String(filters.keyword).trim()
      if (kw) {
        where.OR = [
          { name: { contains: kw } },
          { tagLabel: { contains: kw } },
          { movementKey: { contains: kw } },
        ]
      }
    }

    return where
  }

  buildOrderBy(sort = {}) {
    switch (sort.sort) {
      case 'name':
        return [{ name: 'asc' }, { sortOrder: 'asc' }]
      case 'sortOrder':
        return [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      case 'new':
      default:
        return [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    }
  }

  async findMany(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}, roleVisibilityWhere = null) {
    const includeAll =
      pagination.includeAll === true ||
      pagination.includeAll === 'true' ||
      pagination.includeAll === '1' ||
      pagination.includeAll === 1
    const { page = 1, pageSize = 20 } = pagination
    const skip = (page - 1) * pageSize
    const where = mergeWhereWithRoleVisibility(this.buildWhere(filters), roleVisibilityWhere)
    const orderBy = this.buildOrderBy(sort)

    const [data, total] = await Promise.all([
      prisma.cameraMovementItem.findMany({
        where,
        ...(includeAll ? {} : { skip, take: pageSize }),
        orderBy,
      }),
      prisma.cameraMovementItem.count({ where }),
    ])

    return {
      data,
      total,
      page: includeAll ? 1 : page,
      pageSize: includeAll ? Math.max(total, 1) : pageSize,
    }
  }

  async findById(id) {
    return prisma.cameraMovementItem.findUnique({ where: { id } })
  }

  async findByMovementKey(movementKey) {
    return prisma.cameraMovementItem.findUnique({ where: { movementKey } })
  }

  async create(data) {
    return prisma.cameraMovementItem.create({ data })
  }

  async update(id, data, tx = null) {
    const db = tx || prisma
    return db.cameraMovementItem.update({ where: { id }, data })
  }

  async delete(id) {
    return prisma.cameraMovementItem.delete({ where: { id } })
  }
}

module.exports = new CameraMovementLibraryRepository()
