const prisma = require('../config/database')
const { mergeWhereWithRoleVisibility } = require('../utils/catalogRoleBinding')

const SYSTEM_PROMPT_SELECT = {
  id: true,
  title: true,
  functionKey: true,
  description: true,
  type: true,
  isActive: true,
}

const ITEM_INCLUDE = {
  systemPrompts: {
    orderBy: { createdAt: 'asc' },
    include: {
      systemPrompt: { select: SYSTEM_PROMPT_SELECT },
    },
  },
}

class StyleLibraryRepository {
  buildWhere(filters = {}) {
    const where = {}

    if (filters.mediaType) {
      where.mediaType = filters.mediaType
    }
    if (filters.systemPromptId) {
      where.systemPrompts = {
        some: { systemPromptId: filters.systemPromptId },
      }
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === true || filters.isActive === 'true'
    }
    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured === true || filters.isFeatured === 'true'
    }
    if (filters.keyword) {
      const kw = String(filters.keyword).trim()
      if (kw) {
        where.OR = [{ name: { contains: kw } }, { summary: { contains: kw } }]
      }
    }
    if (filters.scene) {
      where.tags = {
        string_contains: `"${filters.scene}"`,
      }
    }

    return where
  }

  buildOrderBy(sort = {}) {
    switch (sort.sort) {
      case 'hot':
        return [{ usageCount: 'desc' }, { recommendScore: 'desc' }, { createdAt: 'desc' }]
      case 'new':
        return [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
      case 'sortOrder':
        return [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      case 'recommend':
      default:
        return [{ isFeatured: 'desc' }, { recommendScore: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }]
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
      prisma.styleLibraryItem.findMany({
        where,
        ...(includeAll ? {} : { skip, take: pageSize }),
        orderBy,
        include: ITEM_INCLUDE,
      }),
      prisma.styleLibraryItem.count({ where }),
    ])

    return {
      data,
      total,
      page: includeAll ? 1 : page,
      pageSize: includeAll ? Math.max(total, 1) : pageSize,
    }
  }

  async findById(id) {
    return prisma.styleLibraryItem.findUnique({
      where: { id },
      include: ITEM_INCLUDE,
    })
  }

  async create(itemData, systemPromptIds) {
    return prisma.styleLibraryItem.create({
      data: {
        ...itemData,
        systemPrompts: {
          create: systemPromptIds.map(systemPromptId => ({ systemPromptId })),
        },
      },
      include: ITEM_INCLUDE,
    })
  }

  async update(id, itemData, systemPromptIds) {
    const data = { ...itemData }

    if (systemPromptIds !== undefined) {
      data.systemPrompts = {
        deleteMany: {},
        create: systemPromptIds.map(systemPromptId => ({ systemPromptId })),
      }
    }

    return prisma.styleLibraryItem.update({
      where: { id },
      data,
      include: ITEM_INCLUDE,
    })
  }

  async delete(id) {
    return prisma.styleLibraryItem.delete({ where: { id } })
  }

  async incrementUsageCount(id) {
    return prisma.styleLibraryItem.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
      include: ITEM_INCLUDE,
    })
  }
}

module.exports = new StyleLibraryRepository()
