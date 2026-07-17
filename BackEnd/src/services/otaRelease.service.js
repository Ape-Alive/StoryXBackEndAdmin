const otaReleaseRepository = require('../repositories/otaRelease.repository')
const logService = require('./log.service')
const { signRelease, loadPrivateKey, verifyReleaseSignature } = require('../utils/otaSigning')
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')
const {
  OTA_LAYERS,
  OTA_CHANNELS,
  OTA_PLATFORMS,
  OTA_BUNDLE_TYPES,
  OTA_UPDATE_METHODS,
  normalizePlatform,
  validateLayer,
  validateChannel,
  validatePlatform,
  validateBundleType,
  validateUpdateMethod,
  passesReleaseTargeting,
  parseRolloutRule,
  buildRolloutRule,
} = require('../constants/otaRelease')
const { validateOtaDownloadUrl, validateOtaFeedUrl } = require('../utils/otaUrl')
const { assertChannelAccess } = require('../utils/otaChannelAccess')
const { signOwnOtaDownloadUrl } = require('../utils/otaArtifactAccess')

async function auditOtaAction(action, release, auditContext = {}) {
  if (!auditContext.adminId || auditContext.userType === 'user') return
  await logService.logAdminAction({
    adminId: auditContext.adminId,
    action,
    targetType: 'ota_release',
    targetId: release?.id,
    details: {
      layer: release?.layer,
      platform: release?.platform,
      version: release?.version,
      buildNumber: release?.buildNumber,
      bundleType: release?.bundleType,
      updateMethod: release?.updateMethod,
    },
    ipAddress: auditContext.ipAddress,
  })
}

function canManageOta(role) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR].includes(role)
}

function serializeRelease(item) {
  if (!item) return item
  const rule = parseRolloutRule(item.rolloutRule)
  const now = Date.now()
  const publishAtMs = item.publishAt ? new Date(item.publishAt).getTime() : null
  let publishStatus = 'draft'
  if (item.isPublished) {
    if (publishAtMs != null && publishAtMs > now) publishStatus = 'scheduled'
    else publishStatus = 'live'
  }
  return {
    ...item,
    fileSize: item.fileSize != null ? Number(item.fileSize) : item.fileSize,
    targetDeviceIds: rule.deviceIds,
    publishStatus,
  }
}

function normalizeSha256(value) {
  const hex = String(value || '').trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(hex)) {
    throw new BadRequestError('sha256 must be 64 hex characters')
  }
  return hex
}

function buildUpdatePayload(release) {
  // check 响应中对本站 /uploads/ota 签发短期 URL；DB 仍存原始无签名 URL，签名包也不含 query
  const downloadUrl = signOwnOtaDownloadUrl(release.downloadUrl)
  const feedUrl = release.feedUrl ? signOwnOtaDownloadUrl(release.feedUrl) : null
  const base = {
    version: release.version,
    buildNumber: release.buildNumber,
    platform: release.platform,
    downloadUrl,
    sha256: release.sha256,
    fileSize: Number(release.fileSize),
    forceUpdate: release.forceUpdate === true,
    releaseNotes: release.releaseNotes || '',
    signature: release.signature || null,
    layer: release.layer,
  }
  if (release.layer === 'shell') {
    return {
      ...base,
      updateMethod: release.updateMethod,
      feedUrl,
    }
  }
  if (release.layer === 'backend') {
    return {
      ...base,
      bundleType: release.bundleType,
      minBaseBuild: release.minBaseBuild ?? null,
    }
  }
  return {
    ...base,
    bundleType: release.bundleType,
    minBackendBuild: release.minBackendBuild ?? null,
  }
}

async function pickTargetedRelease(deviceId, query) {
  const candidates = await otaReleaseRepository.findPublishedCandidates(query)
  for (const release of candidates) {
    if (passesReleaseTargeting(deviceId, release)) {
      return release
    }
  }
  return null
}

class OtaReleaseService {
  getMeta() {
    return {
      layers: OTA_LAYERS.map(value => ({ value, label: value })),
      channels: OTA_CHANNELS.map(value => ({ value, label: value })),
      platforms: OTA_PLATFORMS.map(value => ({ value, label: value })),
      bundleTypes: OTA_BUNDLE_TYPES,
      updateMethods: OTA_UPDATE_METHODS,
    }
  }

  async list(filters, pagination) {
    const result = await otaReleaseRepository.findMany(filters, pagination)
    return {
      ...result,
      data: result.data.map(serializeRelease),
    }
  }

  async getDetail(id) {
    const item = await otaReleaseRepository.findById(id)
    if (!item) throw new NotFoundError('OTA release not found')
    return serializeRelease(item)
  }

  validateCreatePayload(data) {
    const layer = String(data.layer || '').trim()
    validateLayer(layer)

    const channel = data.channel != null ? String(data.channel).trim() : 'stable'
    validateChannel(channel)

    const version = String(data.version || '').trim()
    if (!version) throw new BadRequestError('version is required')

    const buildNumber = Number(data.buildNumber)
    if (!Number.isInteger(buildNumber) || buildNumber <= 0) {
      throw new BadRequestError('buildNumber must be a positive integer')
    }

    const downloadUrl = validateOtaDownloadUrl(data.downloadUrl, {
      allowHttpLocal: process.env.NODE_ENV !== 'production',
    })

    const sha256 = normalizeSha256(data.sha256)
    const fileSize = BigInt(data.fileSize)
    if (fileSize <= 0n) throw new BadRequestError('fileSize must be positive')

    const rolloutPercent = data.rolloutPercent != null ? Number(data.rolloutPercent) : 100
    if (!Number.isInteger(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) {
      throw new BadRequestError('rolloutPercent must be 0-100')
    }

    let platform
    let bundleType = data.bundleType != null ? String(data.bundleType).trim() || null : null
    let updateMethod = data.updateMethod != null ? String(data.updateMethod).trim() || null : null
    let minBaseBuild = data.minBaseBuild != null && data.minBaseBuild !== '' ? Number(data.minBaseBuild) : null
    let minBackendBuild =
      data.minBackendBuild != null && data.minBackendBuild !== '' ? Number(data.minBackendBuild) : null
    let feedUrl = data.feedUrl != null ? validateOtaFeedUrl(String(data.feedUrl).trim() || null, {
      allowHttpLocal: process.env.NODE_ENV !== 'production',
    }) : null

    if (layer === 'shell') {
      platform = String(data.platform || '').trim()
      validatePlatform(platform)
      if (platform === 'all') throw new BadRequestError('shell platform cannot be all')
      validateUpdateMethod(platform, updateMethod)
      if (updateMethod === 'auto_install' && !feedUrl) {
        throw new BadRequestError('feedUrl is required when updateMethod is auto_install')
      }
      bundleType = null
      minBaseBuild = null
      minBackendBuild = null
    } else if (layer === 'backend') {
      validateBundleType(layer, bundleType)
      if (bundleType === 'patch') {
        platform = 'all'
        if (!Number.isInteger(minBaseBuild) || minBaseBuild <= 0) {
          throw new BadRequestError('minBaseBuild is required for backend patch')
        }
      } else {
        platform = String(data.platform || '').trim()
        validatePlatform(platform)
        if (platform === 'all') throw new BadRequestError('backend full requires specific platform')
        minBaseBuild = null
      }
      updateMethod = null
      feedUrl = null
      minBackendBuild = null
    } else {
      platform = 'all'
      bundleType = 'dist'
      updateMethod = null
      feedUrl = null
      minBaseBuild = null
      if (minBackendBuild != null && (!Number.isInteger(minBackendBuild) || minBackendBuild <= 0)) {
        throw new BadRequestError('minBackendBuild must be a positive integer')
      }
    }

    return {
      layer,
      platform,
      bundleType,
      updateMethod,
      channel,
      version,
      buildNumber,
      minBaseBuild,
      minBackendBuild,
      downloadUrl,
      feedUrl,
      fileSize,
      sha256,
      releaseNotes: data.releaseNotes != null ? String(data.releaseNotes) : null,
      forceUpdate: data.forceUpdate === true,
      rolloutPercent,
      rolloutRule:
        data.targetDeviceIds != null || data.deviceIds != null
          ? buildRolloutRule({ deviceIds: data.targetDeviceIds ?? data.deviceIds })
          : data.rolloutRule !== undefined
            ? buildRolloutRule(parseRolloutRule(data.rolloutRule))
            : null,
    }
  }

  async create(data, adminId, userRole, auditContext = {}) {
    if (!canManageOta(userRole)) throw new ForbiddenError('Permission denied')
    const payload = this.validateCreatePayload(data)
    const item = await otaReleaseRepository.create({
      ...payload,
      createdBy: adminId || null,
    })
    await auditOtaAction('ota_release.create', item, { ...auditContext, adminId })
    return serializeRelease(item)
  }

  async update(id, data, userRole, auditContext = {}) {
    if (!canManageOta(userRole)) throw new ForbiddenError('Permission denied')
    const existing = await otaReleaseRepository.findById(id)
    if (!existing) throw new NotFoundError('OTA release not found')
    if (existing.isPublished) {
      throw new BadRequestError('已发布版本不可直接编辑，请先下线后再修改')
    }

    const merged = {
      ...existing,
      ...data,
      layer: existing.layer,
      buildNumber: existing.buildNumber,
      version: existing.version,
      platform: data.platform ?? existing.platform,
      bundleType: data.bundleType ?? existing.bundleType,
      updateMethod: data.updateMethod ?? existing.updateMethod,
    }
    const payload = this.validateCreatePayload(merged)
    const item = await otaReleaseRepository.updateIfUnpublished(id, payload)
    if (!item) {
      throw new BadRequestError('已发布版本不可直接编辑，请先下线后再修改')
    }
    await auditOtaAction('ota_release.update', item, auditContext)
    return serializeRelease(item)
  }

  async publish(id, userRole, auditContext = {}, options = {}) {
    if (!canManageOta(userRole)) throw new ForbiddenError('Permission denied')
    const existing = await otaReleaseRepository.findById(id)
    if (!existing) throw new NotFoundError('OTA release not found')
    if (existing.isPublished) {
      throw new BadRequestError('该版本已发布，请先下线后再重新发布')
    }

    const signature = signRelease(existing)
    if (loadPrivateKey()) {
      if (!signature) {
        throw new BadRequestError('OTA signing key configured but signing failed')
      }
    }

    let finalSignature = signature
    if (!finalSignature && existing.signature) {
      if (!verifyReleaseSignature(existing, existing.signature)) {
        throw new BadRequestError('Existing OTA signature is invalid')
      }
      finalSignature = existing.signature
    }

    if (process.env.OTA_REQUIRE_SIGNATURE === 'true' && !finalSignature) {
      throw new BadRequestError('Published OTA release must have Ed25519 signature')
    }

    const mode = options.mode === 'scheduled' ? 'scheduled' : 'immediate'
    const now = new Date()
    let publishAt = now
    if (mode === 'scheduled') {
      if (!options.publishAt) {
        throw new BadRequestError('定时发布必须指定生效时间 publishAt')
      }
      publishAt = new Date(options.publishAt)
      if (Number.isNaN(publishAt.getTime())) {
        throw new BadRequestError('publishAt 不是有效时间')
      }
      if (publishAt.getTime() <= now.getTime()) {
        throw new BadRequestError('定时发布时间必须晚于当前时间')
      }
    }

    const item = await otaReleaseRepository.update(id, {
      isPublished: true,
      publishAt,
      publishedAt: now,
      signature: finalSignature,
    })
    await auditOtaAction('ota_release.publish', item, {
      ...auditContext,
      details: { mode, publishAt },
    })
    return serializeRelease(item)
  }

  async unpublish(id, userRole, auditContext = {}) {
    if (!canManageOta(userRole)) throw new ForbiddenError('Permission denied')
    const existing = await otaReleaseRepository.findById(id)
    if (!existing) throw new NotFoundError('OTA release not found')
    const item = await otaReleaseRepository.update(id, {
      isPublished: false,
      publishedAt: null,
      publishAt: null,
    })
    await auditOtaAction('ota_release.unpublish', item, auditContext)
    return serializeRelease(item)
  }

  async remove(id, userRole, auditContext = {}) {
    if (!canManageOta(userRole)) throw new ForbiddenError('Permission denied')
    const existing = await otaReleaseRepository.findById(id)
    if (!existing) throw new NotFoundError('OTA release not found')
    const item = await otaReleaseRepository.softDelete(id)
    await auditOtaAction('ota_release.delete', item, auditContext)
    return serializeRelease(item)
  }

  async checkUpdates(body = {}, req = null) {
    const channel = body.channel != null ? String(body.channel).trim() : 'stable'
    validateChannel(channel)
    if (req) assertChannelAccess(channel, req)

    const platformKey = normalizePlatform(body.platform, body.arch)
    const deviceId = body.deviceId || body.current?.deviceId || 'anonymous'
    const current = body.current || {}

    const updates = {}
    const mandatory = { shell: false, backend: false, frontend: false }

    const shellCurrent = current.shell || {}
    const shellRelease = await pickTargetedRelease(deviceId, {
      layer: 'shell',
      platform: platformKey,
      channel,
      minBuildNumber: Number(shellCurrent.buildNumber) || 0,
    })
    if (shellRelease) {
      updates.shell = buildUpdatePayload(shellRelease)
      mandatory.shell = shellRelease.forceUpdate === true
    }

    const backendCurrent = current.backend || {}
    const backendBuild = Number(backendCurrent.buildNumber) || 0
    const baseBuild = Number(backendCurrent.baseBuild) || backendBuild

    let backendRelease = await pickTargetedRelease(deviceId, {
      layer: 'backend',
      platform: 'all',
      channel,
      bundleType: 'patch',
      minBuildNumber: backendBuild,
    })

    if (backendRelease) {
      const minBase = Number(backendRelease.minBaseBuild) || 0
      if (baseBuild < minBase) {
        backendRelease = await pickTargetedRelease(deviceId, {
          layer: 'backend',
          platform: platformKey,
          channel,
          bundleType: 'full',
          minBuildNumber: backendBuild,
        })
      }
    } else {
      backendRelease = await pickTargetedRelease(deviceId, {
        layer: 'backend',
        platform: platformKey,
        channel,
        bundleType: 'full',
        minBuildNumber: backendBuild,
      })
    }

    if (backendRelease) {
      updates.backend = buildUpdatePayload(backendRelease)
      mandatory.backend = backendRelease.forceUpdate === true
    }

    const frontendCurrent = current.frontend || {}
    const frontendBuild = Number(frontendCurrent.buildNumber) || 0
    let canOfferFrontend = true

    if (updates.backend) {
      canOfferFrontend = false
    } else {
      const frontendReleaseCandidate = await pickTargetedRelease(deviceId, {
        layer: 'frontend',
        platform: 'all',
        channel,
        bundleType: 'dist',
        minBuildNumber: frontendBuild,
      })
      if (frontendReleaseCandidate?.minBackendBuild) {
        const requiredBackend = Number(frontendReleaseCandidate.minBackendBuild)
        const effectiveBackend = updates.backend?.buildNumber || backendBuild
        if (effectiveBackend < requiredBackend) {
          canOfferFrontend = false
        }
      }
    }

    if (canOfferFrontend) {
      const frontendRelease = await pickTargetedRelease(deviceId, {
        layer: 'frontend',
        platform: 'all',
        channel,
        bundleType: 'dist',
        minBuildNumber: frontendBuild,
      })
      if (frontendRelease) {
        updates.frontend = buildUpdatePayload(frontendRelease)
        mandatory.frontend = frontendRelease.forceUpdate === true
      }
    }

    const applyOrder = []
    if (updates.backend) applyOrder.push('backend')
    if (updates.frontend) applyOrder.push('frontend')

    return {
      serverTime: new Date().toISOString(),
      updates,
      applyOrder,
      mandatory,
    }
  }
}

module.exports = new OtaReleaseService()
