const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const otaReportRepository = require('../repositories/otaReport.repository')
const { BadRequestError } = require('../utils/errors')
const { signOwnOtaDownloadUrl } = require('../utils/otaArtifactAccess')

const OTA_EVENTS = [
  'download_complete',
  'apply_success',
  'apply_failed',
  'rollback',
  'check',
]

class OtaReportService {
  async createReport(body = {}) {
    const deviceId = String(body.deviceId || '').trim()
    const event = String(body.event || '').trim()

    if (!deviceId) throw new BadRequestError('deviceId is required')
    if (!OTA_EVENTS.includes(event)) {
      throw new BadRequestError(`Invalid event: ${event}`)
    }

    return otaReportRepository.create({
      deviceId,
      event,
      layer: body.layer != null ? String(body.layer) : null,
      fromBuild: body.fromBuild != null ? Number(body.fromBuild) : null,
      toBuild: body.toBuild != null ? Number(body.toBuild) : null,
      platform: body.platform != null ? String(body.platform) : null,
      channel: body.channel != null ? String(body.channel) : null,
      error: body.error != null ? String(body.error).slice(0, 4000) : null,
    })
  }

  async list(filters, pagination) {
    return otaReportRepository.findMany(filters, pagination)
  }

  handleArtifactUpload(file, body = {}) {
    if (!file) throw new BadRequestError('No file uploaded')

    const hash = crypto.createHash('sha256')
    hash.update(fs.readFileSync(file.path))
    const sha256 = hash.digest('hex')
    const fileSize = fs.statSync(file.path).size

    const layer = String(body.layer || 'misc').trim()
    const publicBase = (process.env.OTA_PUBLIC_BASE_URL || process.env.API_PUBLIC_BASE_URL || '').replace(/\/$/, '')
    const relativePath = path.relative(path.join(__dirname, '../../uploads'), file.path).replace(/\\/g, '/')
    const rawUrl = publicBase
      ? `${publicBase}/uploads/${relativePath}`
      : `/uploads/${relativePath}`

    return {
      // 表单/DB 存无签名原始 URL；check 响应当场签发短期下载地址
      downloadUrl: rawUrl,
      previewDownloadUrl: signOwnOtaDownloadUrl(rawUrl),
      sha256,
      fileSize,
      fileName: file.filename,
      originalName: file.originalname,
      layer,
    }
  }
}

module.exports = new OtaReportService()
