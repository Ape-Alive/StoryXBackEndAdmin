const crypto = require('crypto')
const { URL } = require('url')

const DEFAULT_TTL_SECONDS = Number(process.env.OTA_ARTIFACT_URL_TTL_SECONDS || 3600)

function getSigningSecret() {
  return (
    process.env.OTA_ARTIFACT_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'storyx-ota-artifact-dev-secret'
  )
}

function isPublicArtifacts() {
  return process.env.OTA_ARTIFACT_PUBLIC === 'true'
}

function normalizeRelativePath(pathname) {
  const raw = String(pathname || '').replace(/^\/+/, '')
  if (!raw.startsWith('uploads/ota/')) return null
  if (raw.includes('..')) return null
  return raw
}

function signRelativePath(relativePath, expiresAtUnix) {
  const payload = `${relativePath}:${expiresAtUnix}`
  return crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex')
}

function verifyArtifactAccess(relativePath, expires, signature) {
  if (isPublicArtifacts()) return true
  const path = normalizeRelativePath(relativePath)
  if (!path) return false
  const exp = Number(expires)
  const sig = String(signature || '')
  if (!Number.isFinite(exp) || !sig) return false
  if (Math.floor(Date.now() / 1000) > exp) return false
  const expected = signRelativePath(path, exp)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * 若 downloadUrl 指向本服务 /uploads/ota/*，附加短期签名参数；外链 CDN 原样返回。
 */
function signOwnOtaDownloadUrl(downloadUrl, { ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
  const raw = String(downloadUrl || '').trim()
  if (!raw || isPublicArtifacts()) return raw

  let pathname
  let baseForRebuild = null
  try {
    if (raw.startsWith('/')) {
      pathname = raw.split('?')[0]
    } else {
      const parsed = new URL(raw)
      pathname = parsed.pathname
      baseForRebuild = `${parsed.protocol}//${parsed.host}`
    }
  } catch {
    return raw
  }

  const relative = normalizeRelativePath(pathname.replace(/^\/+/, ''))
  if (!relative) return raw

  const expires = Math.floor(Date.now() / 1000) + Math.max(60, Number(ttlSeconds) || DEFAULT_TTL_SECONDS)
  const sig = signRelativePath(relative, expires)
  const pathWithSlash = `/${relative}`
  const qs = `expires=${expires}&sig=${sig}`

  if (baseForRebuild) {
    return `${baseForRebuild}${pathWithSlash}?${qs}`
  }
  return `${pathWithSlash}?${qs}`
}

module.exports = {
  isPublicArtifacts,
  normalizeRelativePath,
  signOwnOtaDownloadUrl,
  verifyArtifactAccess,
  signRelativePath,
}
