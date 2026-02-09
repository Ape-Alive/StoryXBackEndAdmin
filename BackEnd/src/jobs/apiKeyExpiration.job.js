const userApiKeyRepository = require('../repositories/userApiKey.repository');
const logger = require('../utils/logger');

/**
 * API Key过期检查定时任务
 */
class ApiKeyExpirationJob {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.interval = parseInt(process.env.API_KEY_EXPIRATION_CHECK_INTERVAL || '300000', 10); // 默认5分钟
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.intervalId) {
      logger.warn('API Key expiration job is already running');
      return;
    }

    // 检查 Prisma Client 是否已生成 userApiKey 模型
    const prisma = require('../config/database');
    if (!prisma.userApiKey) {
      logger.warn('Prisma Client userApiKey model not found. Please run: npx prisma generate');
      return;
    }

    logger.info(`Starting API Key expiration check job (interval: ${this.interval}ms)`);

    // 立即执行一次
    this.checkExpiredApiKeys();

    // 设置定时执行
    this.intervalId = setInterval(() => {
      this.checkExpiredApiKeys();
    }, this.interval);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('API Key expiration job stopped');
    }
  }

  /**
   * 检查并更新过期的API Key状态
   */
  async checkExpiredApiKeys() {
    if (this.isRunning) {
      logger.debug('API Key expiration check is already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // 检查 Prisma Client 是否已生成 userApiKey 模型
      const prisma = require('../config/database');
      if (!prisma.userApiKey) {
        logger.debug('Prisma Client userApiKey model not found, skipping expiration check');
        return;
      }

      logger.debug('Checking for expired API keys...');
      
      const result = await userApiKeyRepository.updateExpiredStatus();
      
      if (result.count > 0) {
        logger.info(`Updated ${result.count} expired API keys`);
      } else {
        logger.debug('No expired API keys found');
      }
    } catch (error) {
      logger.error('Error checking expired API keys:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new ApiKeyExpirationJob();
