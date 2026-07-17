const { TooManyRequestsError } = require('../utils/errors')

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = Number(process.env.OTA_CHECK_RATE_LIMIT || 60)
const buckets = new Map()

function cleanupBuckets(now) {
  if (buckets.size < 10000) return
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.startedAt > WINDOW_MS) buckets.delete(key)
  }
}

function incrementBucket(key, now) {
  let entry = buckets.get(key)
  if (!entry || now - entry.startedAt > WINDOW_MS) {
    entry = { startedAt: now, count: 0 }
    buckets.set(key, entry)
  }
  entry.count += 1
  return entry.count
}

function otaCheckRateLimit(req, res, next) {
  const deviceId = String(req.body?.deviceId || 'anonymous').slice(0, 128)
  const ip = String(req.realIp || req.ip || req.connection?.remoteAddress || 'unknown')
  const now = Date.now()

  cleanupBuckets(now)

  const ipKey = `ip:${ip}`
  const compositeKey = `ip:${ip}:dev:${deviceId}`

  const ipCount = incrementBucket(ipKey, now)
  const compositeCount = incrementBucket(compositeKey, now)

  if (ipCount > MAX_REQUESTS || compositeCount > MAX_REQUESTS) {
    return next(new TooManyRequestsError(`OTA check rate limit exceeded (${MAX_REQUESTS}/min)`))
  }
  return next()
}

module.exports = { otaCheckRateLimit }
