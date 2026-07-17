const { BadRequestError } = require('../utils/errors')

const OTA_LAYERS = ['shell', 'backend', 'frontend', 'misc']

function assertSafeOtaLayer(layer) {
  const value = String(layer || '').trim()
  if (!OTA_LAYERS.includes(value)) {
    throw new BadRequestError(`Invalid OTA layer: ${layer}`)
  }
  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new BadRequestError('Invalid OTA layer path')
  }
  return value
}

function getAllowedDownloadHosts() {
  const raw = process.env.OTA_ALLOWED_DOWNLOAD_HOSTS
  if (!raw) return null
  return raw
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

function assertAllowedDownloadHost(parsed) {
  const allowedHosts = getAllowedDownloadHosts()
  if (!allowedHosts?.length) return

  if (process.env.NODE_ENV === 'production' || process.env.OTA_ENFORCE_DOWNLOAD_HOSTS === 'true') {
    const hostname = String(parsed.hostname || '').toLowerCase()
    if (!allowedHosts.includes(hostname)) {
      throw new BadRequestError(`downloadUrl host "${hostname}" is not in OTA_ALLOWED_DOWNLOAD_HOSTS`)
    }
  }
}

function validateOtaDownloadUrl(url, { allowHttpLocal = true } = {}) {
  const raw = String(url || '').trim()
  if (!raw) throw new BadRequestError('downloadUrl is required')

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new BadRequestError('downloadUrl must be a valid URL')
  }

  const isLocal =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]'

  if (parsed.protocol !== 'https:' && !(allowHttpLocal && isLocal && parsed.protocol === 'http:')) {
    throw new BadRequestError('downloadUrl must use HTTPS (http allowed only for localhost in development)')
  }

  assertAllowedDownloadHost(parsed)
  return raw
}

function validateOtaFeedUrl(url, options) {
  if (!url) return null
  return validateOtaDownloadUrl(url, options)
}

module.exports = {
  OTA_LAYERS,
  assertSafeOtaLayer,
  validateOtaDownloadUrl,
  validateOtaFeedUrl,
}
