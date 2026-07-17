const crypto = require('crypto')

function normalizeDownloadUrlForSign(downloadUrl) {
  const raw = String(downloadUrl || '').trim()
  if (!raw) return ''
  try {
    if (raw.startsWith('/')) return raw.split('?')[0].split('#')[0]
    const parsed = new URL(raw)
    parsed.search = ''
    parsed.hash = ''
    return parsed.href
  } catch {
    return raw.split('?')[0].split('#')[0]
  }
}

function canonicalSignPayload({ layer, buildNumber, sha256, downloadUrl, fileSize, forceUpdate }) {
  // 仅在强制更新时写入 forceUpdate，避免破坏已发布非强制版本的签名
  const payload = {
    buildNumber: Number(buildNumber),
    downloadUrl: normalizeDownloadUrlForSign(downloadUrl),
    fileSize: Number(fileSize),
    layer: String(layer),
    sha256: String(sha256 || '').trim().toLowerCase(),
  }
  if (forceUpdate === true) {
    payload.forceUpdate = true
  }
  return JSON.stringify(payload)
}

function loadPrivateKey() {
  const pem = process.env.OTA_SIGNING_PRIVATE_KEY
  if (!pem) return null
  return crypto.createPrivateKey(pem.replace(/\\n/g, '\n'))
}

function loadPublicKey() {
  const pem = process.env.OTA_SIGNING_PUBLIC_KEY
  if (!pem) return null
  return crypto.createPublicKey(pem.replace(/\\n/g, '\n'))
}

function signRelease(release) {
  const privateKey = loadPrivateKey()
  if (!privateKey) return null
  const message = canonicalSignPayload({
    layer: release.layer,
    buildNumber: release.buildNumber,
    sha256: release.sha256,
    downloadUrl: release.downloadUrl,
    fileSize: release.fileSize,
    forceUpdate: release.forceUpdate,
  })
  const signature = crypto.sign(null, Buffer.from(message, 'utf8'), privateKey)
  return signature.toString('base64')
}

function verifyReleaseSignature(release, signatureBase64, publicKeyPem) {
  if (!signatureBase64) return false
  const publicKey = publicKeyPem
    ? crypto.createPublicKey(publicKeyPem.replace(/\\n/g, '\n'))
    : loadPublicKey()
  if (!publicKey) return false
  const message = canonicalSignPayload({
    layer: release.layer,
    buildNumber: release.buildNumber,
    sha256: release.sha256,
    downloadUrl: release.downloadUrl,
    fileSize: release.fileSize,
    forceUpdate: release.forceUpdate,
  })
  return crypto.verify(
    null,
    Buffer.from(message, 'utf8'),
    publicKey,
    Buffer.from(signatureBase64, 'base64'),
  )
}

function generateKeyPairPem() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  }
}

module.exports = {
  canonicalSignPayload,
  normalizeDownloadUrlForSign,
  signRelease,
  verifyReleaseSignature,
  generateKeyPairPem,
  loadPrivateKey,
  loadPublicKey,
}
