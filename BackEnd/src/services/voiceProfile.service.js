const voiceProfileRepository = require('../repositories/voiceProfile.repository')
const modelRepository = require('../repositories/model.repository')
const {
  TARGET_TYPES,
  buildVisibleWhereForRole,
  mergeWhereWithRoleVisibility,
  enrichItemsWithRoleBindings,
  enrichItemWithRoleBindings,
  parseOptionalRoleBindingInput,
  applyRoleBindingFields,
} = require('../utils/catalogRoleBinding')
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')

async function withVoiceCatalogRoleFilter(baseWhere, catalogRoleContext, userId) {
  if (!catalogRoleContext) {
    return baseWhere
  }

  const roleWhere = await buildVisibleWhereForRole(
    TARGET_TYPES.VOICE_PROFILE,
    catalogRoleContext.effectiveRoleId,
  )
  const accessWhere = userId
    ? { OR: [{ scope: 'user', userId }, roleWhere] }
    : roleWhere

  return mergeWhereWithRoleVisibility(baseWhere, accessWhere)
}

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

function parseIncludeAllFlag(includeAll) {
  return (
    includeAll === true ||
    includeAll === 'true' ||
    includeAll === '1' ||
    includeAll === 1
  )
}

/** 剩余积分（credits - usedCredits），用于排序 */
function remainingCredits(key) {
  return Number(key.credits ?? 0) - Number(key.usedCredits ?? 0)
}

/**
 * 未传 userApiKeyId 时自动选择一条 Key。
 * 管理员：仅系统级 Key（userId 为空）。
 * 终端用户：本人 Key 与系统级 Key 均可；**优先本人 Key**，同档内绑定授权数更少、剩余积分更多优先。
 * @param {{ providerId: string, userId: string|null, isAdmin: boolean }} opts
 */
async function pickUserApiKeyIdForClone(prisma, { providerId, userId, isAdmin }) {
  const now = Math.floor(Date.now() / 1000)
  const where = isAdmin
    ? { providerId, status: 'active', userId: null }
    : {
        providerId,
        status: 'active',
        OR: [{ userId }, { userId: null }],
      }
  const keys = await prisma.userApiKey.findMany({
    where,
    select: {
      id: true,
      userId: true,
      expireTime: true,
      credits: true,
      usedCredits: true,
      _count: { select: { authorizations: true } },
    },
  })
  const candidates = keys.filter((k) => {
    const exp = typeof k.expireTime === 'bigint' ? Number(k.expireTime) : Number(k.expireTime)
    return !(exp && exp > 0 && exp <= now)
  })
  if (!candidates.length) {
    throw new BadRequestError(
      isAdmin
        ? 'No active system API key for this provider; add one or pass userApiKeyId'
        : 'No active API key for this provider; bind a key or pass userApiKeyId'
    )
  }
  const tier = (k) => (k.userId === null ? 1 : 0) // 0=本人优先，1=系统级次之（仅终端用户分支会混排）
  candidates.sort((a, b) => {
    if (!isAdmin) {
      const ta = tier(a)
      const tb = tier(b)
      if (ta !== tb) return ta - tb
    }
    const bindA = a._count.authorizations
    const bindB = b._count.authorizations
    if (bindA !== bindB) return bindA - bindB
    const remDiff = remainingCredits(b) - remainingCredits(a)
    if (remDiff !== 0) return remDiff
    return String(a.id).localeCompare(String(b.id))
  })
  return candidates[0].id
}

/** 终端用户可见：system 全量 + scope=user 且 userId=当前用户（其它筛选可叠加） */
function endUserAccessibleVoiceWhere(filters, userId) {
  return {
    ...(filters.voiceId ? { voiceId: { contains: filters.voiceId } } : {}),
    ...(filters.name ? { name: { contains: filters.name } } : {}),
    ...(filters.modelId !== undefined
      ? { models: { some: { modelId: filters.modelId } } }
      : {}),
    ...(filters.isActive !== undefined
      ? { isActive: filters.isActive === 'true' || filters.isActive === true }
      : {}),
    OR: [{ scope: 'system' }, { scope: 'user', userId }],
  }
}

class VoiceProfileService {
  async getVoiceProfiles(
    filters = {},
    pagination = {},
    sort = {},
    userRole = null,
    userId = null,
    includeAll = false,
    catalogRoleContext = null,
  ) {
    const isAdmin = userRole && isAdminRole(userRole)
    const includeAllOn = parseIncludeAllFlag(includeAll)

    // 管理员：includeAll=true 时忽略 scope/userId 限制，强制“全量”查询
    if (isAdmin && includeAllOn) {
      const effectiveFilters = { ...(filters || {}) }
      delete effectiveFilters.scope
      delete effectiveFilters.userId
      const result = await voiceProfileRepository.findVoiceProfiles(effectiveFilters, pagination, sort)
      result.data = await enrichItemsWithRoleBindings(TARGET_TYPES.VOICE_PROFILE, result.data)
      return result
    }

    // 终端用户：只能看到 system 音色 + 自己的 user 音色
    if (!isAdmin) {
      const prisma = require('../config/database')
      const orderBy = { createdAt: sort.createdAt || 'desc' }

      // includeAll=true：一次性返回全部「system + 自己的 user」（仍受 voiceId/name/modelId/isActive 筛选）
      if (includeAllOn) {
        const baseWhere = await withVoiceCatalogRoleFilter(
          endUserAccessibleVoiceWhere(filters, userId),
          catalogRoleContext,
          userId,
        )

        const [data, total] = await Promise.all([
          prisma.voiceProfile.findMany({
            where: baseWhere,
            orderBy,
            include: {
              user: true,
              models: { include: { model: { include: { provider: true } } } },
            },
          }),
          prisma.voiceProfile.count({ where: baseWhere }),
        ])

        return {
          data: await enrichItemsWithRoleBindings(TARGET_TYPES.VOICE_PROFILE, data),
          total,
          page: 1,
          pageSize: Math.max(total, 1),
        }
      }

      // 若明确筛 scope=user，则强制 userId=自己
      if (filters.scope === 'user') {
        filters.userId = userId
      } else if (filters.scope === 'system') {
        filters.userId = null
      } else {
        const { page = 1, pageSize = 20 } = pagination
        const skip = (page - 1) * pageSize

        const baseWhere = await withVoiceCatalogRoleFilter(
          endUserAccessibleVoiceWhere(filters, userId),
          catalogRoleContext,
          userId,
        )

        const [data, total] = await Promise.all([
          prisma.voiceProfile.findMany({
            where: baseWhere,
            skip,
            take: pageSize,
            orderBy,
            include: {
              user: true,
              models: { include: { model: { include: { provider: true } } } },
            },
          }),
          prisma.voiceProfile.count({ where: baseWhere }),
        ])

        return {
          data: await enrichItemsWithRoleBindings(TARGET_TYPES.VOICE_PROFILE, data),
          total,
          page,
          pageSize,
        }
      }
    }

    let roleVisibilityWhere = null
    if (catalogRoleContext) {
      roleVisibilityWhere = await buildVisibleWhereForRole(
        TARGET_TYPES.VOICE_PROFILE,
        catalogRoleContext.effectiveRoleId,
      )
    }

    const result = await voiceProfileRepository.findVoiceProfiles(
      filters,
      pagination,
      sort,
      roleVisibilityWhere,
    )
    result.data = await enrichItemsWithRoleBindings(TARGET_TYPES.VOICE_PROFILE, result.data)
    return result
  }

  async getVoiceProfileDetail(id, userRole = null, userId = null, catalogRoleContext = null) {
    const profile = await voiceProfileRepository.findById(id)
    if (!profile) throw new NotFoundError('Voice profile not found')

    const isAdmin = userRole && isAdminRole(userRole)
    if (!isAdmin) {
      const canView =
        profile.scope === 'system' || (profile.scope === 'user' && profile.userId === userId)
      if (!canView) throw new ForbiddenError('Permission denied')
    }

    if (catalogRoleContext) {
      if (profile.scope === 'user') {
        if (profile.userId !== (userId || catalogRoleContext.userId)) {
          throw new NotFoundError('Voice profile not found')
        }
      } else {
        const prisma = require('../config/database')
        const roleWhere = await buildVisibleWhereForRole(
          TARGET_TYPES.VOICE_PROFILE,
          catalogRoleContext.effectiveRoleId,
        )
        const visible = await prisma.voiceProfile.findFirst({
          where: mergeWhereWithRoleVisibility({ id }, roleWhere),
        })
        if (!visible) {
          throw new NotFoundError('Voice profile not found')
        }
      }
    }

    return enrichItemWithRoleBindings(TARGET_TYPES.VOICE_PROFILE, profile)
  }

  async createVoiceProfile(data, userId = null, userRole = null) {
    const isAdmin = userRole && isAdminRole(userRole)

    if (!data.voiceId || !String(data.voiceId).trim()) {
      throw new BadRequestError('voiceId is required')
    }

    const scope = data.scope || 'system'
    if (!['system', 'user'].includes(scope)) {
      throw new BadRequestError('Invalid scope')
    }

    // scope=system 只能管理员创建
    if (scope === 'system' && !isAdmin) {
      throw new ForbiddenError('Only admin can create system voice profiles')
    }

    // scope=user：userId 固定为当前用户
    const targetUserId = scope === 'user' ? userId : null
    if (scope === 'user' && !targetUserId) {
      throw new BadRequestError('User ID is required for user voice profiles')
    }

    // voiceId 全局唯一
    const existing = await voiceProfileRepository.findByVoiceId(String(data.voiceId).trim())
    if (existing) throw new ConflictError('voiceId already exists')

    // tags（JSON数组）校验与规范化
    const normalizeTags = (tags) => {
      if (tags === undefined) return undefined
      if (tags === null) return null
      if (!Array.isArray(tags)) throw new BadRequestError('tags must be an array')
      // 允许 string 或 {type,value}；统一转成 {type,value}
      const out = []
      for (const t of tags) {
        if (t == null) continue
        if (typeof t === 'string') {
          const s = t.trim()
          if (s) out.push({ type: 'trait', value: s })
          continue
        }
        if (typeof t === 'object') {
          const type = String(t.type || '').trim()
          const value = String(t.value || '').trim()
          if (type && value) out.push({ type, value })
          continue
        }
      }
      return out
    }

    const tags = normalizeTags(data.tags)
    if (!tags || tags.length === 0) {
      throw new BadRequestError('tags is required')
    }
    const hasAge = tags.some((t) => t.type === 'age')
    const hasGender = tags.some((t) => t.type === 'gender' && (t.value === 'male' || t.value === 'female'))
    const hasTrait = tags.some((t) => t.type === 'trait')
    if (!hasAge) throw new BadRequestError('tags missing required age')
    if (!hasGender) throw new BadRequestError('tags missing required gender (male/female)')
    if (!hasTrait) throw new BadRequestError('tags missing required trait')

    // modelIds 校验（可选）
    const modelIds = Array.isArray(data.modelIds)
      ? data.modelIds.filter(Boolean)
      : data.modelId
        ? [data.modelId]
        : []
    for (const mid of modelIds) {
      const model = await modelRepository.findById(mid)
      if (!model) throw new NotFoundError('Model not found')
    }

    const prisma = require('../config/database')
    const profile = await prisma.voiceProfile.create({
      data: {
        voiceId: String(data.voiceId).trim(),
        scope,
        userId: targetUserId,
        sampleUrl: data.sampleUrl || null,
        avatarUrl: data.avatarUrl || null,
        name: data.name || null,
        description: data.description || null,
        meta: data.meta || null,
        supportsVoiceCommand: data.supportsVoiceCommand === true,
        tags: tags === null ? null : tags,
        isActive: data.isActive !== undefined ? data.isActive === true : true,
        models: modelIds.length
          ? {
            create: modelIds.map((id) => ({
              model: { connect: { id } }
            }))
          }
          : undefined
      },
      include: {
        user: true,
        models: { include: { model: { include: { provider: true } } } }
      }
    })

    return profile
  }

  async updateVoiceProfile(id, data, userId = null, userRole = null) {
    const profile = await voiceProfileRepository.findById(id)
    if (!profile) throw new NotFoundError('Voice profile not found')

    const isAdmin = userRole && isAdminRole(userRole)

    if (!isAdmin) {
      // 用户只能更新自己的 user 音色
      if (!(profile.scope === 'user' && profile.userId === userId)) {
        throw new ForbiddenError('Permission denied')
      }
    }

    if (data.voiceId !== undefined && String(data.voiceId).trim() !== profile.voiceId) {
      const existing = await voiceProfileRepository.findByVoiceId(String(data.voiceId).trim())
      if (existing) throw new ConflictError('voiceId already exists')
    }

    if (data.scope !== undefined && data.scope !== profile.scope) {
      throw new BadRequestError('scope cannot be changed')
    }

    if (data.userId !== undefined) {
      // 避免越权：不允许客户端直接改 userId
      if (data.userId !== undefined) {
        throw new BadRequestError('userId cannot be updated')
      }
    }

    const prisma = require('../config/database')

    // tags（可选更新）：若传入则必须包含 age/gender/trait
    const normalizeTags = (tags) => {
      if (tags === undefined) return undefined
      if (tags === null) return null
      if (!Array.isArray(tags)) throw new BadRequestError('tags must be an array')
      const out = []
      for (const t of tags) {
        if (t == null) continue
        if (typeof t === 'string') {
          const s = t.trim()
          if (s) out.push({ type: 'trait', value: s })
          continue
        }
        if (typeof t === 'object') {
          const type = String(t.type || '').trim()
          const value = String(t.value || '').trim()
          if (type && value) out.push({ type, value })
          continue
        }
      }
      return out
    }
    const normalizedTags = normalizeTags(data.tags)
    if (normalizedTags !== undefined) {
      if (!normalizedTags || normalizedTags.length === 0) throw new BadRequestError('tags is required')
      const hasAge = normalizedTags.some((t) => t.type === 'age')
      const hasGender = normalizedTags.some((t) => t.type === 'gender' && (t.value === 'male' || t.value === 'female'))
      const hasTrait = normalizedTags.some((t) => t.type === 'trait')
      if (!hasAge) throw new BadRequestError('tags missing required age')
      if (!hasGender) throw new BadRequestError('tags missing required gender (male/female)')
      if (!hasTrait) throw new BadRequestError('tags missing required trait')
    }

    // modelIds 更新（可选）：传 modelIds 或 兼容旧字段 modelId
    let wantsUpdateModels = data.modelIds !== undefined || data.modelId !== undefined
    const modelIds = Array.isArray(data.modelIds)
      ? data.modelIds.filter(Boolean)
      : data.modelId !== undefined
        ? (data.modelId ? [data.modelId] : [])
        : null

    const normalizeIds = (ids) => [...new Set((ids || []).filter(Boolean))].sort()
    const existingModelIds = normalizeIds((profile.models || []).map((m) => m.modelId))
    const incomingModelIds = normalizeIds(modelIds || [])

    // 如果客户端每次都带上 modelIds，但实际没有变化，则视为“未更新模型绑定”
    if (
      wantsUpdateModels &&
      modelIds &&
      modelIds.length > 0 &&
      JSON.stringify(existingModelIds) === JSON.stringify(incomingModelIds)
    ) {
      wantsUpdateModels = false
    }

    if (wantsUpdateModels && profile.isModelLocked) {
      throw new BadRequestError('Model binding is locked for this voice profile')
    }

    if (wantsUpdateModels && modelIds) {
      for (const mid of modelIds) {
        const model = await modelRepository.findById(mid)
        if (!model) throw new NotFoundError('Model not found')
      }
    }

    return prisma.voiceProfile.update({
      where: { id },
      data: {
        ...(data.voiceId !== undefined ? { voiceId: String(data.voiceId).trim() } : {}),
        ...(data.sampleUrl !== undefined ? { sampleUrl: data.sampleUrl || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
        ...(data.name !== undefined ? { name: data.name || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.meta !== undefined ? { meta: data.meta || null } : {}),
        ...(data.supportsVoiceCommand !== undefined
          ? { supportsVoiceCommand: data.supportsVoiceCommand === true }
          : {}),
        ...(normalizedTags !== undefined ? { tags: normalizedTags === null ? null : normalizedTags } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive === true } : {}),
        ...(wantsUpdateModels && modelIds
          ? {
            models: {
              deleteMany: {},
              create: modelIds.map((mid) => ({
                model: { connect: { id: mid } }
              }))
            }
          }
          : {})
      },
      include: {
        user: true,
        models: { include: { model: { include: { provider: true } } } }
      }
    })
  }

  async deleteVoiceProfile(id, userId = null, userRole = null) {
    const profile = await voiceProfileRepository.findById(id)
    if (!profile) throw new NotFoundError('Voice profile not found')

    const isAdmin = userRole && isAdminRole(userRole)
    if (!isAdmin) {
      if (!(profile.scope === 'user' && profile.userId === userId)) {
        throw new ForbiddenError('Permission denied')
      }
    }

    // 若该音色由「音色克隆」流程创建，则同步删除第三方远程音色（delete_voice）
    // - 仅当 meta 中具备 providerId/apiPath/userApiKeyId 时才执行远程删除
    let meta
    if (profile.meta) {
      try {
        meta = typeof profile.meta === 'string' ? JSON.parse(profile.meta) : profile.meta
      } catch {
        meta = null
      }
    }

    const canRemoteDelete =
      meta &&
      meta.source === 'clone' &&
      typeof meta.providerId === 'string' &&
      typeof meta.apiPath === 'string' &&
      typeof meta.userApiKeyId === 'string' &&
      profile.voiceId

    if (canRemoteDelete) {
      const prisma = require('../config/database')
      const axios = require('axios')
      const { decryptApiKey } = require('../utils/crypto')

      const provider = await prisma.aIProvider.findUnique({ where: { id: meta.providerId } })
      if (!provider) throw new BadRequestError('Remote delete failed: provider not found')

      const endpoint = meta.apiPath.startsWith('http')
        ? meta.apiPath
        : `${String(provider.baseUrl || '').replace(/\/$/, '')}${meta.apiPath.startsWith('/') ? '' : '/'}${meta.apiPath}`
      if (!endpoint.startsWith('http')) {
        throw new BadRequestError('Remote delete failed: invalid provider baseUrl or apiPath')
      }

      const apiKeyRecord = await prisma.userApiKey.findUnique({ where: { id: meta.userApiKeyId } })
      if (!apiKeyRecord) throw new BadRequestError('Remote delete failed: API Key not found')
      if (apiKeyRecord.providerId !== meta.providerId) {
        throw new BadRequestError('Remote delete failed: API Key does not belong to this provider')
      }
      if (apiKeyRecord.status !== 'active') throw new BadRequestError('Remote delete failed: API Key is not active')

      const token = decryptApiKey(apiKeyRecord.apiKey)
      if (!token) throw new BadRequestError('Remote delete failed: invalid API key')

      const payload = {
        model: 'voice-enrollment',
        input: {
          action: 'delete_voice',
          voice_id: String(profile.voiceId),
        },
      }

      try {
        const resp = await axios.post(endpoint, payload, {
          timeout: 30000,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        // 调试：打印第三方删除响应（必要时可删除）
        console.log(
          '[DELETE /api/voice-profiles/:id] third-party delete_voice response:',
          JSON.stringify(resp?.data, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
        )
      } catch (e) {
        throw new BadRequestError(`Remote delete failed: ${e.response?.data?.message || e.message}`)
      }
    }

    await voiceProfileRepository.delete(id)
    return { success: true }
  }

  async cloneVoiceProfile(data, userId = null, userRole = null) {
    const prisma = require('../config/database')
    const axios = require('axios')
    const { decryptApiKey } = require('../utils/crypto')

    const isAdmin = userRole && isAdminRole(userRole)
    /** 与 `/clone` 路由一致：仅超级/平台管理员免计积分 */
    const isVoiceCloneBillingExempt =
      userRole && [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole)
    if (!isAdmin && !userId) {
      throw new ForbiddenError('Login required to clone voice profile')
    }

    const providerId = data.providerId
    const apiPath = String(data.apiPath || '').trim()
    const prefix = String(data.prefix || '').trim()
    const audioUrl = String(data.audioUrl || '').trim()
    const modelId = data.modelId
    const rawKeyId = data.userApiKeyId

    if (!providerId || !apiPath || !prefix || !audioUrl || !modelId) {
      throw new BadRequestError('Missing required fields')
    }
    if (!/^[a-zA-Z0-9]+$/.test(prefix)) {
      throw new BadRequestError('prefix 仅支持英文字母与数字（与上游复刻接口要求一致）')
    }

    const provider = await prisma.aIProvider.findUnique({ where: { id: providerId } })
    if (!provider) throw new NotFoundError('Provider not found')

    // 校验 apiPath 是否在提供商配置里
    let allowed = []
    if (provider.voiceCloneApis) {
      try {
        const parsed = JSON.parse(provider.voiceCloneApis)
        if (Array.isArray(parsed)) allowed = parsed
      } catch {
        // ignore
      }
    }
    const isAllowed = allowed.some((x) => x && x.path === apiPath)
    if (!isAllowed) throw new BadRequestError('apiPath is not allowed for this provider')

    let userApiKeyId =
      rawKeyId !== undefined && rawKeyId !== null && String(rawKeyId).trim() !== ''
        ? String(rawKeyId).trim()
        : null
    if (!userApiKeyId) {
      userApiKeyId = await pickUserApiKeyIdForClone(prisma, { providerId, userId, isAdmin })
    }

    const apiKeyRecord = await prisma.userApiKey.findUnique({ where: { id: userApiKeyId } })
    if (!apiKeyRecord) throw new NotFoundError('API Key not found')
    if (apiKeyRecord.providerId !== providerId) throw new BadRequestError('API Key does not belong to this provider')
    if (apiKeyRecord.status !== 'active') throw new BadRequestError('API Key is not active')
    if (!isAdmin) {
      const isOwn = apiKeyRecord.userId === userId
      const isSystemKey = apiKeyRecord.userId === null
      if (!isOwn && !isSystemKey) {
        throw new ForbiddenError('You can only clone using your own API Key or a system API key')
      }
    }

    const now = Math.floor(Date.now() / 1000)
    const expireTime = typeof apiKeyRecord.expireTime === 'bigint' ? Number(apiKeyRecord.expireTime) : Number(apiKeyRecord.expireTime)
    if (expireTime && expireTime > 0 && expireTime <= now) throw new BadRequestError('API Key is expired')

    const model = await modelRepository.findById(modelId)
    if (!model) throw new NotFoundError('Model not found')

    const endpoint = apiPath.startsWith('http')
      ? apiPath
      : `${String(provider.baseUrl || '').replace(/\/$/, '')}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`

    if (!endpoint.startsWith('http')) {
      throw new BadRequestError('Invalid provider baseUrl or apiPath')
    }

    const token = decryptApiKey(apiKeyRecord.apiKey)
    if (!token) throw new BadRequestError('Invalid API key')

    const cloneCost = Math.max(0, Number(provider.voiceCloneCreditsPerCall ?? 0) || 0)
    const keyCap = Number(apiKeyRecord.credits) || 0
    const keyUsed = Number(apiKeyRecord.usedCredits) || 0
    // 终端用户需校验 Key 剩余积分；超级/平台管理员克隆不扣费、不拦截
    if (!isVoiceCloneBillingExempt && cloneCost > 0 && keyCap > 0 && keyCap - keyUsed < cloneCost) {
      throw new BadRequestError('Insufficient API key credits for voice clone')
    }

    const payload = {
      model: 'voice-enrollment',
      input: {
        action: 'create_voice',
        target_model: model.name,
        prefix,
        url: audioUrl,
      },
    }

    let resp
    try {
      resp = await axios.post(endpoint, payload, {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      throw new BadRequestError(`Clone voice request failed: ${e.response?.data?.message || e.message}`)
    }

    const body = resp?.data
    const voiceId =
      body?.voice_id ||
      body?.voiceId ||
      body?.output?.voice_id ||
      body?.output?.voiceId ||
      body?.data?.voice_id ||
      body?.data?.voiceId
    if (!voiceId) throw new BadRequestError('Clone voice response missing voice_id')

    const scope = isAdmin ? 'system' : 'user'
    const ownerUserId = isAdmin ? null : userId
    const logMetaBase = { modelId, prefix, isAdmin, billingExempt: !!isVoiceCloneBillingExempt, cloneCost, configuredPerCall: cloneCost }

    const created = await prisma.$transaction(async (tx) => {
      const dup = await tx.voiceProfile.findUnique({ where: { voiceId: String(voiceId) } })
      if (dup) throw new ConflictError('voiceId already exists')

      const profile = await tx.voiceProfile.create({
        data: {
          voiceId: String(voiceId),
          scope,
          userId: ownerUserId,
          sampleUrl:
            data.sampleUrl === undefined || data.sampleUrl === null || String(data.sampleUrl).trim() === ''
              ? null
              : String(data.sampleUrl).trim(),
          avatarUrl:
            data.avatarUrl === undefined || data.avatarUrl === null || String(data.avatarUrl).trim() === ''
              ? null
              : String(data.avatarUrl).trim(),
          name:
            data.name === undefined || data.name === null || String(data.name).trim() === ''
              ? null
              : String(data.name).trim(),
          description:
            data.description === undefined || data.description === null || String(data.description).trim() === ''
              ? null
              : String(data.description).trim(),
          tags: data.tags === undefined ? null : data.tags,
          meta: JSON.stringify({
            source: 'clone',
            providerId,
            apiPath,
            userApiKeyId,
            prefix,
            audioUrl,
            targetModel: model.name,
            cloneCreditsCharged: isVoiceCloneBillingExempt ? 0 : cloneCost,
            ...(isVoiceCloneBillingExempt ? { adminCloneNoCharge: true, configuredCloneCost: cloneCost } : {}),
            ...(ownerUserId ? { ownerUserId } : {}),
            raw: body,
          }),
          isModelLocked: true,
          isActive: true,
          models: {
            create: [
              {
                model: { connect: { id: modelId } },
              },
            ],
          },
        },
      })

      const keyRow = await tx.userApiKey.findUnique({ where: { id: userApiKeyId } })
      if (!keyRow) throw new NotFoundError('API Key not found')
      const usedBefore = Number(keyRow.usedCredits) || 0

      if (isVoiceCloneBillingExempt) {
        await tx.voiceCloneCreditLog.create({
          data: {
            actorUserId: userId || null,
            userApiKeyId,
            providerId,
            voiceProfileId: profile.id,
            voiceId: String(voiceId),
            amountCharged: 0,
            keyCreditsCap: keyRow.credits,
            usedCreditsBefore: usedBefore,
            usedCreditsAfter: usedBefore,
            status: 'admin_exempt',
            meta: JSON.stringify({
              ...logMetaBase,
              reason: 'super/platform admin clone: no credit deduction',
              configuredPerCall: cloneCost,
            }),
          },
        })
      } else if (cloneCost > 0) {
        const cap = Number(keyRow.credits) || 0
        if (cap > 0 && cap - usedBefore < cloneCost) {
          throw new BadRequestError('Insufficient API key credits for voice clone')
        }
        await tx.userApiKey.update({
          where: { id: userApiKeyId },
          data: { usedCredits: { increment: cloneCost } },
        })
        const keyAfter = await tx.userApiKey.findUnique({
          where: { id: userApiKeyId },
          select: { usedCredits: true, credits: true },
        })
        const usedAfter = Number(keyAfter.usedCredits) || 0
        await tx.voiceCloneCreditLog.create({
          data: {
            actorUserId: userId || null,
            userApiKeyId,
            providerId,
            voiceProfileId: profile.id,
            voiceId: String(voiceId),
            amountCharged: cloneCost,
            keyCreditsCap: keyRow.credits,
            usedCreditsBefore: usedBefore,
            usedCreditsAfter: usedAfter,
            status: 'charged',
            meta: JSON.stringify(logMetaBase),
          },
        })
      } else {
        await tx.voiceCloneCreditLog.create({
          data: {
            actorUserId: userId || null,
            userApiKeyId,
            providerId,
            voiceProfileId: profile.id,
            voiceId: String(voiceId),
            amountCharged: 0,
            keyCreditsCap: keyRow.credits,
            usedCreditsBefore: usedBefore,
            usedCreditsAfter: usedBefore,
            status: 'no_charge_configured',
            meta: JSON.stringify({ ...logMetaBase, reason: 'voiceCloneCreditsPerCall is 0' }),
          },
        })
      }

      return tx.voiceProfile.findUnique({
        where: { id: profile.id },
        include: {
          user: true,
          models: { include: { model: { include: { provider: true } } } },
        },
      })
    })

    return created
  }
}

module.exports = new VoiceProfileService()

