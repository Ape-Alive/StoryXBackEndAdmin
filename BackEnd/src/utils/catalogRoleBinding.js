const prisma = require('../config/database')
const { BadRequestError } = require('./errors')

const TARGET_TYPES = {
  AI_PROVIDER: 'ai_provider',
  AI_MODEL: 'ai_model',
  VOICE_PROFILE: 'voice_profile',
  PROMPT: 'prompt',
  STYLE_LIBRARY_ITEM: 'style_library_item',
  CAMERA_MOVEMENT_ITEM: 'camera_movement_item',
}

const PRISMA_DELEGATES = {
  [TARGET_TYPES.AI_PROVIDER]: () => prisma.aIProvider,
  [TARGET_TYPES.AI_MODEL]: () => prisma.aIModel,
  [TARGET_TYPES.VOICE_PROFILE]: () => prisma.voiceProfile,
  [TARGET_TYPES.PROMPT]: () => prisma.prompt,
  [TARGET_TYPES.STYLE_LIBRARY_ITEM]: () => prisma.styleLibraryItem,
  [TARGET_TYPES.CAMERA_MOVEMENT_ITEM]: () => prisma.cameraMovementItem,
}

function normalizeRoleIdList(clientRoleIds) {
  if (clientRoleIds === undefined || clientRoleIds === null) {
    return []
  }
  if (!Array.isArray(clientRoleIds)) {
    throw new BadRequestError('clientRoleIds must be an array')
  }
  return [...new Set(clientRoleIds.map(id => String(id).trim()).filter(Boolean))]
}

function normalizeRoleBindingInput({ clientRoleBindAll, clientRoleIds }) {
  const roleIds = normalizeRoleIdList(clientRoleIds)
  const bindAllExplicit = clientRoleBindAll === true
  const bindNoneExplicit = clientRoleBindAll === false

  if (bindAllExplicit) {
    if (roleIds.length > 0) {
      throw new BadRequestError('clientRoleBindAll and clientRoleIds are mutually exclusive')
    }
    return { clientRoleBindAll: true, clientRoleIds: [] }
  }

  if (roleIds.length > 0) {
    if (clientRoleBindAll === true) {
      throw new BadRequestError('clientRoleBindAll and clientRoleIds are mutually exclusive')
    }
    return { clientRoleBindAll: false, clientRoleIds: roleIds }
  }

  if (bindNoneExplicit) {
    throw new BadRequestError('clientRoleIds required when clientRoleBindAll is false')
  }

  throw new BadRequestError('Specify clientRoleBindAll=true or provide clientRoleIds')
}

function hasRoleBindingInput(data) {
  return data.clientRoleBindAll !== undefined || data.clientRoleIds !== undefined
}

function parseOptionalRoleBindingInput(data) {
  if (!hasRoleBindingInput(data)) {
    return null
  }
  return normalizeRoleBindingInput({
    clientRoleBindAll: data.clientRoleBindAll,
    clientRoleIds: data.clientRoleIds,
  })
}

/**
 * 创建时解析绑定：有入参用入参；否则 defaultRoleKey（如 package_paid_user）或 bindAll。
 */
async function resolveBindingForCreate(data, { defaultBindAll = true, defaultRoleKey = null } = {}) {
  const parsed = parseOptionalRoleBindingInput(data)
  if (parsed) return parsed

  if (defaultRoleKey) {
    const role = await prisma.clientRole.findFirst({
      where: { roleKey: defaultRoleKey, status: 'active' },
      select: { id: true },
    })
    if (!role) {
      throw new BadRequestError(
        `Default client role "${defaultRoleKey}" is missing; bind roles explicitly or seed client roles`,
      )
    }
    return { clientRoleBindAll: false, clientRoleIds: [role.id] }
  }

  if (defaultBindAll === true) {
    return { clientRoleBindAll: true, clientRoleIds: [] }
  }

  throw new BadRequestError('Specify clientRoleBindAll=true or provide clientRoleIds')
}

async function assertValidRoleIds(roleIds) {
  const ids = normalizeRoleIdList(roleIds)
  if (ids.length === 0) {
    return []
  }

  const roles = await prisma.clientRole.findMany({
    where: { id: { in: ids }, status: 'active' },
    select: { id: true, roleKey: true, name: true },
  })

  if (roles.length !== ids.length) {
    throw new BadRequestError('One or more client roles are invalid or inactive')
  }

  return roles
}

async function replaceBindings(tx, targetType, targetId, bindingInput) {
  const normalized = normalizeRoleBindingInput(bindingInput)
  await assertValidRoleIds(normalized.clientRoleIds)

  await tx.catalogRoleBinding.deleteMany({
    where: { targetType, targetId },
  })

  if (!normalized.clientRoleBindAll && normalized.clientRoleIds.length > 0) {
    await tx.catalogRoleBinding.createMany({
      data: normalized.clientRoleIds.map(roleId => ({
        targetType,
        targetId,
        roleId,
      })),
    })
  }

  return normalized
}

async function getBindingsMap(targetType, targetIds) {
  const ids = [...new Set((targetIds || []).map(id => String(id)).filter(Boolean))]
  const result = {}

  for (const id of ids) {
    result[id] = {
      clientRoleBindAll: true,
      clientRoleIds: [],
      clientRoles: [],
    }
  }

  if (ids.length === 0) {
    return result
  }

  const delegate = PRISMA_DELEGATES[targetType]?.()
  if (!delegate) {
    throw new BadRequestError(`Unknown catalog target type: ${targetType}`)
  }

  const [entities, bindings] = await Promise.all([
    delegate.findMany({
      where: { id: { in: ids } },
      select: { id: true, clientRoleBindAll: true },
    }),
    prisma.catalogRoleBinding.findMany({
      where: { targetType, targetId: { in: ids } },
      include: {
        role: {
          select: { id: true, roleKey: true, name: true },
        },
      },
    }),
  ])

  for (const entity of entities) {
    result[entity.id].clientRoleBindAll = entity.clientRoleBindAll
  }

  for (const binding of bindings) {
    const entry = result[binding.targetId]
    if (!entry) continue
    entry.clientRoleIds.push(binding.roleId)
    entry.clientRoles.push({
      id: binding.role.id,
      roleKey: binding.role.roleKey,
      name: binding.role.name,
    })
  }

  return result
}

async function buildVisibleWhereForRole(targetType, effectiveRoleId) {
  if (!effectiveRoleId) {
    return { clientRoleBindAll: true }
  }

  const boundRows = await prisma.catalogRoleBinding.findMany({
    where: { targetType, roleId: effectiveRoleId },
    select: { targetId: true },
  })
  const boundIds = boundRows.map(row => row.targetId)

  if (boundIds.length === 0) {
    return { clientRoleBindAll: true }
  }

  return {
    OR: [{ clientRoleBindAll: true }, { id: { in: boundIds } }],
  }
}

async function listVisibleTargetIds(targetType, roleId) {
  const delegate = PRISMA_DELEGATES[targetType]?.()
  if (!delegate) {
    throw new BadRequestError(`Unknown catalog target type: ${targetType}`)
  }

  const where = await buildVisibleWhereForRole(targetType, roleId)
  const rows = await delegate.findMany({
    where,
    select: { id: true },
  })
  return rows.map(row => row.id)
}

/**
 * 判断目标是否对指定客户端角色可见（bindAll 或绑定表命中）
 */
async function isTargetVisibleForRole(targetType, targetId, effectiveRoleId) {
  if (!targetId) return false
  const delegate = PRISMA_DELEGATES[targetType]?.()
  if (!delegate) {
    throw new BadRequestError(`Unknown catalog target type: ${targetType}`)
  }
  const roleWhere = await buildVisibleWhereForRole(targetType, effectiveRoleId)
  const row = await delegate.findFirst({
    where: mergeWhereWithRoleVisibility({ id: String(targetId) }, roleWhere),
    select: { id: true },
  })
  return !!row
}

function mergeWhereWithRoleVisibility(baseWhere, roleVisibilityWhere) {
  if (!roleVisibilityWhere) {
    return baseWhere
  }
  if (!baseWhere || Object.keys(baseWhere).length === 0) {
    return roleVisibilityWhere
  }
  return {
    AND: [baseWhere, roleVisibilityWhere],
  }
}

async function enrichItemsWithRoleBindings(targetType, items) {
  if (!items?.length) {
    return items || []
  }

  const bindingsMap = await getBindingsMap(
    targetType,
    items.map(item => item.id),
  )

  return items.map(item => {
    const binding = bindingsMap[item.id] || {
      clientRoleBindAll: item.clientRoleBindAll ?? true,
      clientRoleIds: [],
      clientRoles: [],
    }
    return {
      ...item,
      clientRoleBindAll: binding.clientRoleBindAll,
      clientRoleIds: binding.clientRoleIds,
      clientRoles: binding.clientRoles,
    }
  })
}

async function enrichItemWithRoleBindings(targetType, item) {
  if (!item) return item
  const [enriched] = await enrichItemsWithRoleBindings(targetType, [item])
  return enriched
}

async function applyTerminalCatalogFilter(baseWhere, catalogRoleContext, targetType, ownerExceptionWhere = null) {
  if (!catalogRoleContext) {
    return baseWhere
  }

  const roleWhere = await buildVisibleWhereForRole(targetType, catalogRoleContext.effectiveRoleId)
  const accessWhere = ownerExceptionWhere
    ? { OR: [ownerExceptionWhere, roleWhere] }
    : roleWhere

  return mergeWhereWithRoleVisibility(baseWhere, accessWhere)
}

async function applyRoleBindingFields(tx, targetType, targetId, data, delegate) {
  const bindingInput = parseOptionalRoleBindingInput(data)
  if (!bindingInput) {
    return null
  }

  await replaceBindings(tx, targetType, targetId, bindingInput)
  await delegate.update({
    where: { id: targetId },
    data: { clientRoleBindAll: bindingInput.clientRoleBindAll },
  })

  return bindingInput
}

module.exports = {
  TARGET_TYPES,
  normalizeRoleBindingInput,
  parseOptionalRoleBindingInput,
  resolveBindingForCreate,
  hasRoleBindingInput,
  replaceBindings,
  getBindingsMap,
  buildVisibleWhereForRole,
  listVisibleTargetIds,
  isTargetVisibleForRole,
  assertValidRoleIds,
  mergeWhereWithRoleVisibility,
  applyTerminalCatalogFilter,
  enrichItemsWithRoleBindings,
  enrichItemWithRoleBindings,
  applyRoleBindingFields,
}
