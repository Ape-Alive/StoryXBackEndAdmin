const OTA_LAYERS = ['shell', 'backend', 'frontend']

const OTA_CHANNELS = ['stable', 'beta', 'internal']

const OTA_PLATFORMS = [
  'darwin-arm64',
  'darwin-x64',
  'win32-x64',
  'linux-x64',
  'all',
]

const OTA_BUNDLE_TYPES = {
  backend: ['patch', 'full'],
  frontend: ['dist'],
}

const OTA_UPDATE_METHODS = {
  shell: ['auto_install', 'manual_download', 'in_app_download'],
  darwin: ['manual_download', 'in_app_download'],
  win32: ['auto_install', 'manual_download', 'in_app_download'],
  linux: ['manual_download', 'in_app_download'],
}

function normalizePlatform(platform, arch) {
  const p = String(platform || '').trim().toLowerCase()
  const a = String(arch || '').trim().toLowerCase()
  if (p === 'darwin' || p === 'mac' || p === 'macos') {
    if (a === 'arm64' || a === 'aarch64') return 'darwin-arm64'
    return 'darwin-x64'
  }
  if (p === 'win32' || p === 'windows') {
    return 'win32-x64'
  }
  if (p === 'linux') {
    return 'linux-x64'
  }
  if (OTA_PLATFORMS.includes(p)) {
    return p
  }
  return `${p}-${a}`
}

function validateLayer(layer) {
  if (!OTA_LAYERS.includes(layer)) {
    throw new Error(`Invalid layer: ${layer}`)
  }
}

function validateChannel(channel) {
  if (!OTA_CHANNELS.includes(channel)) {
    throw new Error(`Invalid channel: ${channel}`)
  }
}

function validatePlatform(platform) {
  if (!OTA_PLATFORMS.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`)
  }
}

function validateBundleType(layer, bundleType) {
  if (layer === 'shell') {
    if (bundleType != null && bundleType !== '') {
      throw new Error('Shell layer must not have bundleType')
    }
    return
  }
  const allowed = OTA_BUNDLE_TYPES[layer] || []
  if (!allowed.includes(bundleType)) {
    throw new Error(`Invalid bundleType for ${layer}: ${bundleType}`)
  }
}

function validateUpdateMethod(platform, updateMethod) {
  if (!updateMethod) {
    throw new Error('updateMethod is required for shell layer')
  }
  const all = OTA_UPDATE_METHODS.shell
  if (!all.includes(updateMethod)) {
    throw new Error(`Invalid updateMethod: ${updateMethod}`)
  }
  if (platform.startsWith('darwin') && updateMethod === 'auto_install') {
    throw new Error('auto_install is not supported on macOS')
  }
}

function rolloutHash(deviceId) {
  const input = String(deviceId || 'anonymous')
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash % 100
}

function passesRollout(deviceId, rolloutPercent) {
  const percent = Number.isFinite(Number(rolloutPercent)) ? Number(rolloutPercent) : 100
  if (percent >= 100) return true
  if (percent <= 0) return false
  return rolloutHash(deviceId) < percent
}

function parseRolloutRule(rolloutRule) {
  if (!rolloutRule) return { deviceIds: [] }
  let rule = rolloutRule
  if (typeof rule === 'string') {
    try {
      rule = JSON.parse(rule)
    } catch {
      return { deviceIds: [] }
    }
  }
  const raw = Array.isArray(rule.deviceIds) ? rule.deviceIds : []
  const deviceIds = [...new Set(raw.map(id => String(id || '').trim()).filter(Boolean))]
  return { deviceIds }
}

function buildRolloutRule({ deviceIds } = {}) {
  const list = Array.isArray(deviceIds)
    ? [...new Set(deviceIds.map(id => String(id || '').trim()).filter(Boolean))]
    : []
  if (!list.length) return null
  return { deviceIds: list }
}

/**
 * 定向 + 灰度：
 * - 若配置了 deviceIds，仅名单内设备可见
 * - 再按 rolloutPercent 做百分比灰度
 */
function passesReleaseTargeting(deviceId, release) {
  const rule = parseRolloutRule(release?.rolloutRule)
  if (rule.deviceIds.length > 0 && !rule.deviceIds.includes(String(deviceId || ''))) {
    return false
  }
  return passesRollout(deviceId, release?.rolloutPercent)
}

function isReleaseEffectiveNow(release, now = new Date()) {
  if (!release?.isPublished) return false
  if (!release.publishAt) return true
  return new Date(release.publishAt).getTime() <= now.getTime()
}

module.exports = {
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
  rolloutHash,
  passesRollout,
  parseRolloutRule,
  buildRolloutRule,
  passesReleaseTargeting,
  isReleaseEffectiveNow,
}
