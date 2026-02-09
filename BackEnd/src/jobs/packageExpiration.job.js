const packageExpirationService = require('../services/packageExpiration.service');
const logger = require('../utils/logger');

/**
 * 套餐过期检查定时任务
 */
class PackageExpirationJob {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.interval = parseInt(process.env.PACKAGE_EXPIRATION_CHECK_INTERVAL || '300000', 10); // 默认5分钟
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.intervalId) {
      logger.warn('Package expiration job is already running');
      return;
    }

    // 检查 Prisma Client 是否已生成 userPackage 模型
    const prisma = require('../config/database');
    if (!prisma.userPackage) {
      logger.warn('Prisma Client userPackage model not found. Please run: npx prisma generate');
      return;
    }

    logger.info(`Starting package expiration check job (interval: ${this.interval}ms)`);

    // 立即执行一次
    this.checkExpiredPackages();

    // 设置定时执行
    this.intervalId = setInterval(() => {
      this.checkExpiredPackages();
    }, this.interval);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Package expiration job stopped');
    }
  }

  /**
   * 检查并处理过期套餐
   */
  async checkExpiredPackages() {
    if (this.isRunning) {
      logger.debug('Package expiration check is already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // 检查 Prisma Client 是否已生成 userPackage 模型
      const prisma = require('../config/database');
      if (!prisma.userPackage) {
        logger.debug('Prisma Client userPackage model not found, skipping expiration check');
        return;
      }

      logger.debug('Checking for expired packages...');

      const result = await packageExpirationService.handleExpiredPackages();

      if (result.processed > 0) {
        logger.info(`Processed ${result.processed} expired packages (errors: ${result.errors})`);
      } else {
        logger.debug('No expired packages found');
      }

      if (result.errors > 0 && result.errorDetails) {
        logger.warn('Some packages failed to process:', result.errorDetails);
      }
    } catch (error) {
      logger.error('Error checking expired packages:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new PackageExpirationJob();
