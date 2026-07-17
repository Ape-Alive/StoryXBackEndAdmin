const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { assertSafeOtaLayer } = require('../utils/otaUrl')

const otaUploadDir = path.resolve(path.join(__dirname, '../../uploads/ota'))
if (!fs.existsSync(otaUploadDir)) {
  fs.mkdirSync(otaUploadDir, { recursive: true })
}

function sanitizeBuildNumber(raw) {
  const value = String(raw || '').trim()
  if (/^\d+$/.test(value)) return value
  return String(Date.now())
}

function sanitizeUploadExtension(originalName) {
  const ext = path.extname(String(originalName || '')).toLowerCase()
  const allowedExts = ['.zip', '.dmg', '.exe', '.yml', '.blockmap']
  return allowedExts.includes(ext) ? ext : '.zip'
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const layer = assertSafeOtaLayer(req.body?.layer || 'misc')
      const dir = path.resolve(path.join(otaUploadDir, layer))
      if (!dir.startsWith(otaUploadDir + path.sep) && dir !== otaUploadDir) {
        return cb(new Error('Invalid upload destination'))
      }
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    } catch (err) {
      cb(err)
    }
  },
  filename: (req, file, cb) => {
    const buildNumber = sanitizeBuildNumber(req.body?.buildNumber)
    const ext = sanitizeUploadExtension(file.originalname)
    cb(null, `${buildNumber}-${Date.now()}${ext}`)
  },
})

const allowedExts = ['.zip', '.dmg', '.exe', '.yml', '.blockmap']

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedExts.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported artifact type: ${ext}`), false)
  }
}

const otaUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 800 * 1024 * 1024 },
})

module.exports = otaUpload
