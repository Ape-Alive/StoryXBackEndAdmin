const cameraMovementLibraryRepository = require('../repositories/cameraMovementLibrary.repository')
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
const { validateMovementType } = require('../constants/cameraMovementLibrary')

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

function canWriteCameraMovementLibrary(role) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR].includes(role)
}

function serializeItem(item) {
  if (!item) return item
  const { movementKey, ...rest } = item
  return { ...rest, key: movementKey }
}

function normalizeKey(raw) {
  return raw != null ? String(raw).trim() : ''
}

class CameraMovementLibraryService {
  getMeta() {
    return {
      types: [
        { value: 'official', label: '官方' },
        { value: 'custom', label: '自定义' },
      ],
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
        TARGET_TYPES.CAMERA_MOVEMENT_ITEM,
        catalogRoleContext.effectiveRoleId,
      )
    }

    const result = await cameraMovementLibraryRepository.findMany(filters, pagination, sort, roleVisibilityWhere)
    const enriched = await enrichItemsWithRoleBindings(TARGET_TYPES.CAMERA_MOVEMENT_ITEM, result.data)
    return {
      ...result,
      data: enriched.map(serializeItem),
    }
  }

  async getDetail(id, userRole = null, catalogRoleContext = null) {
    const item = await cameraMovementLibraryRepository.findById(id)
    if (!item) {
      throw new NotFoundError('Camera movement item not found')
    }

    const isAdmin = userRole && isAdminRole(userRole)
    if (!isAdmin && !item.isActive) {
      throw new NotFoundError('Camera movement item not found')
    }

    if (catalogRoleContext) {
      const roleWhere = await buildVisibleWhereForRole(
        TARGET_TYPES.CAMERA_MOVEMENT_ITEM,
        catalogRoleContext.effectiveRoleId,
      )
      const visible = await prisma.cameraMovementItem.findFirst({
        where: mergeWhereWithRoleVisibility({ id }, roleWhere),
      })
      if (!visible) {
        throw new NotFoundError('Camera movement item not found')
      }
    }

    const enriched = await enrichItemWithRoleBindings(TARGET_TYPES.CAMERA_MOVEMENT_ITEM, item)
    return serializeItem(enriched)
  }

  async create(data, userRole) {
    if (!canWriteCameraMovementLibrary(userRole)) {
      throw new ForbiddenError('Permission denied')
    }

    const movementKey = normalizeKey(data.key)
    if (!movementKey) {
      throw new BadRequestError('key is required')
    }

    const existing = await cameraMovementLibraryRepository.findByMovementKey(movementKey)
    if (existing) {
      throw new BadRequestError('key already exists')
    }

    const type = data.type != null ? String(data.type).trim() : 'custom'
    try {
      validateMovementType(type)
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    const prompt = data.prompt != null ? String(data.prompt).trim() : ''
    if (!prompt) {
      throw new BadRequestError('prompt is required')
    }

    const bindingInput = parseOptionalRoleBindingInput(data)
    const item = await prisma.$transaction(async tx => {
      const created = await tx.cameraMovementItem.create({
        data: {
          movementKey,
          name: String(data.name).trim(),
          tagLabel: data.tagLabel != null ? String(data.tagLabel).trim() || null : null,
          prompt,
          previewUrl: data.previewUrl != null ? String(data.previewUrl).trim() || null : null,
          type,
          isActive: data.isActive !== false,
          sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
          clientRoleBindAll: bindingInput?.clientRoleBindAll ?? true,
        },
      })

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.CAMERA_MOVEMENT_ITEM, created.id, data, tx.cameraMovementItem)
      }

      return created
    })

    const enriched = await enrichItemWithRoleBindings(TARGET_TYPES.CAMERA_MOVEMENT_ITEM, item)
    return serializeItem(enriched)
  }

  async update(id, data, userRole) {
    if (!canWriteCameraMovementLibrary(userRole)) {
      throw new ForbiddenError('Permission denied')
    }

    const existing = await cameraMovementLibraryRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Camera movement item not found')
    }

    const payload = {}

    if (data.key !== undefined) {
      const movementKey = normalizeKey(data.key)
      if (!movementKey) {
        throw new BadRequestError('key cannot be empty')
      }
      if (movementKey !== existing.movementKey) {
        const dup = await cameraMovementLibraryRepository.findByMovementKey(movementKey)
        if (dup) {
          throw new BadRequestError('key already exists')
        }
        payload.movementKey = movementKey
      }
    }

    if (data.type !== undefined) {
      const type = String(data.type).trim()
      try {
        validateMovementType(type)
      } catch (err) {
        throw new BadRequestError(err.message)
      }
      payload.type = type
    }

    if (data.name !== undefined) {
      payload.name = String(data.name).trim()
    }
    if (data.tagLabel !== undefined) {
      payload.tagLabel = data.tagLabel != null ? String(data.tagLabel).trim() || null : null
    }
    if (data.prompt !== undefined) {
      const prompt = data.prompt != null ? String(data.prompt).trim() : ''
      if (!prompt) {
        throw new BadRequestError('prompt cannot be empty')
      }
      payload.prompt = prompt
    }
    if (data.previewUrl !== undefined) {
      payload.previewUrl = data.previewUrl != null ? String(data.previewUrl).trim() || null : null
    }
    if (data.isActive !== undefined) {
      payload.isActive = data.isActive === true
    }
    if (data.sortOrder !== undefined) {
      payload.sortOrder = Number(data.sortOrder)
    }

    const bindingInput = parseOptionalRoleBindingInput(data)
    const item = await prisma.$transaction(async tx => {
      const updated = await tx.cameraMovementItem.update({
        where: { id },
        data: {
          ...payload,
          ...(bindingInput ? { clientRoleBindAll: bindingInput.clientRoleBindAll } : {}),
        },
      })

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.CAMERA_MOVEMENT_ITEM, id, data, tx.cameraMovementItem)
      }

      return updated
    })

    const enriched = await enrichItemWithRoleBindings(TARGET_TYPES.CAMERA_MOVEMENT_ITEM, item)
    return serializeItem(enriched)
  }

  async remove(id, userRole, { hard = false } = {}) {
    if (!canWriteCameraMovementLibrary(userRole)) {
      throw new ForbiddenError('Permission denied')
    }

    const existing = await cameraMovementLibraryRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Camera movement item not found')
    }

    if (hard) {
      await cameraMovementLibraryRepository.delete(id)
      return null
    }

    const item = await cameraMovementLibraryRepository.update(id, { isActive: false })
    return serializeItem(item)
  }
}

module.exports = new CameraMovementLibraryService()
