const styleLibraryRepository = require('../repositories/styleLibrary.repository')
const prisma = require('../config/database')
const {
  TARGET_TYPES,
  buildVisibleWhereForRole,
  mergeWhereWithRoleVisibility,
  enrichItemsWithRoleBindings,
  enrichItemWithRoleBindings,
  parseOptionalRoleBindingInput,
  applyRoleBindingFields,
} = require('../utils/catalogRoleBinding')
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')
const {
  MEDIA_TYPES,
  MEDIA_TYPE_LABELS,
  SCENE_CATEGORIES,
  validateTags,
  validateMediaType,
  normalizeTags,
} = require('../constants/styleLibrary')

function isAdminRole(role) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.PLATFORM_ADMIN,
    ROLES.OPERATOR,
    ROLES.RISK_CONTROL,
    ROLES.FINANCE,
    ROLES.READ_ONLY,
  ].includes(role)
}

function canWriteStyleLibrary(role) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR].includes(role)
}

function resolveSystemPromptIds(raw) {
  if (raw === undefined || raw === null) {
    return []
  }
  if (!Array.isArray(raw)) {
    throw new BadRequestError('systemPromptIds must be an array')
  }
  return [...new Set(raw.map(id => String(id).trim()).filter(Boolean))]
}

async function assertSystemPrompts(systemPromptIds) {
  const ids = resolveSystemPromptIds(systemPromptIds)
  if (ids.length === 0) {
    return []
  }
  const prompts = await prisma.prompt.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, title: true },
  })

  if (prompts.length !== ids.length) {
    throw new NotFoundError('One or more system prompts not found')
  }

  const invalid = prompts.find(p => p.type !== 'system')
  if (invalid) {
    throw new BadRequestError('All systemPromptIds must reference system type prompts')
  }

  return ids
}

function serializeItem(item) {
  if (!item) return item

  const systemPrompts = (item.systemPrompts || [])
    .map(link => link.systemPrompt)
    .filter(Boolean)

  const { systemPrompts: _links, ...rest } = item

  return {
    ...rest,
    tags: normalizeTags(item.tags),
    systemPromptIds: systemPrompts.map(p => p.id),
    systemPrompts,
  }
}

class StyleLibraryService {
  getMeta() {
    return {
      mediaTypes: MEDIA_TYPES.map(value => ({
        value,
        label: MEDIA_TYPE_LABELS[value],
      })),
      sceneCategories: SCENE_CATEGORIES,
    }
  }

  async list(filters = {}, pagination = {}, sort = {}, userRole = null, catalogRoleContext = null) {
    const isAdmin = userRole && isAdminRole(userRole)

    if (!isAdmin) {
      filters.isActive = true
    }

    let roleVisibilityWhere = null
    if (catalogRoleContext) {
      roleVisibilityWhere = await buildVisibleWhereForRole(
        TARGET_TYPES.STYLE_LIBRARY_ITEM,
        catalogRoleContext.effectiveRoleId,
      )
    }

    const result = await styleLibraryRepository.findMany(filters, pagination, sort, roleVisibilityWhere)
    const enriched = await enrichItemsWithRoleBindings(TARGET_TYPES.STYLE_LIBRARY_ITEM, result.data)
    return {
      ...result,
      data: enriched.map(serializeItem),
    }
  }

  async getDetail(id, userRole = null, catalogRoleContext = null) {
    const item = await styleLibraryRepository.findById(id)
    if (!item) {
      throw new NotFoundError('Style library item not found')
    }

    const isAdmin = userRole && isAdminRole(userRole)
    if (!isAdmin && !item.isActive) {
      throw new NotFoundError('Style library item not found')
    }

    if (catalogRoleContext) {
      const roleWhere = await buildVisibleWhereForRole(
        TARGET_TYPES.STYLE_LIBRARY_ITEM,
        catalogRoleContext.effectiveRoleId,
      )
      const visible = await prisma.styleLibraryItem.findFirst({
        where: mergeWhereWithRoleVisibility({ id }, roleWhere),
      })
      if (!visible) {
        throw new NotFoundError('Style library item not found')
      }
    }

    const enriched = await enrichItemWithRoleBindings(TARGET_TYPES.STYLE_LIBRARY_ITEM, item)
    return serializeItem(enriched)
  }

  async create(data, userRole) {
    if (!canWriteStyleLibrary(userRole)) {
      throw new ForbiddenError('Permission denied')
    }

    try {
      validateMediaType(data.mediaType)
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    let tags
    try {
      tags = validateTags(data.tags)
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    const systemPromptIds = await assertSystemPrompts(data.systemPromptIds)

    const content = data.content != null ? String(data.content).trim() : ''
    if (!content) {
      throw new BadRequestError('content is required')
    }

    const isActive = data.isActive === true
    const payload = {
      name: String(data.name).trim(),
      summary: data.summary != null ? String(data.summary).trim() || null : null,
      coverUrl: data.coverUrl != null ? String(data.coverUrl).trim() || null : null,
      mediaType: data.mediaType,
      stylePromptKey: data.stylePromptKey != null ? String(data.stylePromptKey).trim() || null : null,
      content,
      tags,
      recommendScore: Number.isFinite(Number(data.recommendScore)) ? Number(data.recommendScore) : 0,
      sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
      isActive,
      isFeatured: data.isFeatured === true,
      publishedAt: isActive ? new Date() : null,
    }

    const bindingInput = parseOptionalRoleBindingInput(data)
    const item = await prisma.$transaction(async tx => {
      const created = await tx.styleLibraryItem.create({
        data: {
          ...payload,
          clientRoleBindAll: bindingInput?.clientRoleBindAll ?? true,
          systemPrompts: {
            create: systemPromptIds.map(systemPromptId => ({ systemPromptId })),
          },
        },
        include: {
          systemPrompts: {
            orderBy: { createdAt: 'asc' },
            include: {
              systemPrompt: {
                select: { id: true, title: true, functionKey: true, description: true, type: true, isActive: true },
              },
            },
          },
        },
      })

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.STYLE_LIBRARY_ITEM, created.id, data, tx.styleLibraryItem)
      }

      return created
    })

    const enriched = await enrichItemWithRoleBindings(TARGET_TYPES.STYLE_LIBRARY_ITEM, item)
    return serializeItem(enriched)
  }

  async update(id, data, userRole) {
    if (!canWriteStyleLibrary(userRole)) {
      throw new ForbiddenError('Permission denied')
    }

    const existing = await styleLibraryRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Style library item not found')
    }

    const payload = {}
    let systemPromptIds

    if (data.systemPromptIds !== undefined) {
      systemPromptIds = await assertSystemPrompts(data.systemPromptIds)
    }

    if (data.name !== undefined) {
      payload.name = String(data.name).trim()
    }
    if (data.summary !== undefined) {
      payload.summary = data.summary != null ? String(data.summary).trim() || null : null
    }
    if (data.coverUrl !== undefined) {
      payload.coverUrl = data.coverUrl != null ? String(data.coverUrl).trim() || null : null
    }
    if (data.mediaType !== undefined) {
      try {
        validateMediaType(data.mediaType)
      } catch (err) {
        throw new BadRequestError(err.message)
      }
      payload.mediaType = data.mediaType
    }
    if (data.tags !== undefined) {
      try {
        payload.tags = validateTags(data.tags)
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }
    if (data.stylePromptKey !== undefined) {
      payload.stylePromptKey = data.stylePromptKey != null ? String(data.stylePromptKey).trim() || null : null
    }
    if (data.content !== undefined) {
      const content = data.content != null ? String(data.content).trim() : ''
      if (!content) {
        throw new BadRequestError('content cannot be empty')
      }
      payload.content = content
    }
    if (data.recommendScore !== undefined) {
      payload.recommendScore = Number(data.recommendScore)
    }
    if (data.sortOrder !== undefined) {
      payload.sortOrder = Number(data.sortOrder)
    }
    if (data.isFeatured !== undefined) {
      payload.isFeatured = data.isFeatured === true
    }
    if (data.isActive !== undefined) {
      const nextActive = data.isActive === true
      payload.isActive = nextActive
      if (nextActive && !existing.isActive) {
        payload.publishedAt = new Date()
      }
    }
    if (data.publishedAt !== undefined) {
      payload.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null
    }

    const bindingInput = parseOptionalRoleBindingInput(data)
    const item = await prisma.$transaction(async tx => {
      const updated = await styleLibraryRepository.update(
        id,
        {
          ...payload,
          ...(bindingInput ? { clientRoleBindAll: bindingInput.clientRoleBindAll } : {}),
        },
        systemPromptIds,
      )

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.STYLE_LIBRARY_ITEM, id, data, tx.styleLibraryItem)
      }

      return updated
    })

    const enriched = await enrichItemWithRoleBindings(TARGET_TYPES.STYLE_LIBRARY_ITEM, item)
    return serializeItem(enriched)
  }

  async remove(id, userRole, { hard = false } = {}) {
    if (!canWriteStyleLibrary(userRole)) {
      throw new ForbiddenError('Permission denied')
    }

    const existing = await styleLibraryRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Style library item not found')
    }

    if (hard) {
      await styleLibraryRepository.delete(id)
      return null
    }

    const item = await styleLibraryRepository.update(id, { isActive: false })
    return serializeItem(item)
  }

  async recordUse(id, userRole = null, catalogRoleContext = null) {
    // 复用详情可见性（含角色过滤），不可见则 404
    await this.getDetail(id, userRole, catalogRoleContext)
    const updated = await styleLibraryRepository.incrementUsageCount(id)
    return serializeItem(updated)
  }
}

module.exports = new StyleLibraryService()
