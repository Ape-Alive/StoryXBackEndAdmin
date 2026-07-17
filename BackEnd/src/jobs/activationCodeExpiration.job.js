const activationCodeService = require('../services/activationCode.service')
const logger = require('../utils/logger')

/**
 * 未使用且已过期的激活码定期销毁
 */
class ActivationCodeExpirationJob {
  constructor() {
    this.intervalId = null
    this.isRunning = false
    this.interval = parseInt(process.env.ACTIVATION_CODE_EXPIRE_CHECK_INTERVAL || '600000', 10)
  }

  start() {
    if (this.intervalId) {
      logger.warn('Activation code expiration job is already running')
      return
    }

    const prisma = require('../config/database')
    if (!prisma.activationCode) {
      logger.warn('Prisma Client missing activationCode model. Run: npx prisma generate')
      return
    }

    logger.info(`Starting activation code expiration job (interval: ${this.interval}ms)`)
    this.run()
    this.intervalId = setInterval(() => this.run(), this.interval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Activation code expiration job stopped')
    }
  }

  async run() {
    if (this.isRunning) return
    this.isRunning = true
    try {
      const result = await activationCodeService.destroyExpiredUnused()
      if (result.destroyed > 0) {
        logger.info(`Destroyed ${result.destroyed} expired unused activation code(s)`)
      }
    } catch (error) {
      logger.error('Activation code expiration job failed', {
        message: error.message,
        stack: error.stack,
      })
    } finally {
      this.isRunning = false
    }
  }
}

module.exports = new ActivationCodeExpirationJob()
