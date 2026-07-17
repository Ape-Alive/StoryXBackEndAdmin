const { ForbiddenError } = require('../utils/errors')

function getProtectedChannels() {
  const raw = process.env.OTA_PROTECTED_CHANNELS || 'internal'
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function assertChannelAccess(channel, req) {
  const protectedChannels = getProtectedChannels()
  if (!protectedChannels.includes(channel)) return

  const expectedKey = process.env.OTA_CHECK_API_KEY
  if (!expectedKey) {
    throw new ForbiddenError(`Channel "${channel}" requires OTA_CHECK_API_KEY to be configured`)
  }

  const provided = req.headers['x-ota-api-key']
  if (!provided || provided !== expectedKey) {
    throw new ForbiddenError(`Channel "${channel}" is not accessible`)
  }
}

module.exports = {
  getProtectedChannels,
  assertChannelAccess,
}
