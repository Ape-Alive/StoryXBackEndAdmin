const authorizationCleanupService = require('../services/authorizationCleanup.service');
const logger = require('../utils/logger');

/**
 * 授权清理定时任务
 * 每5分钟执行一次，清理过期授权并释放额度
 */
class AuthorizationCleanupJob {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * 启动定时任务
   * @param {number} intervalMinutes - 执行间隔（分钟），默认5分钟
   */
  start(intervalMinutes = 5) {
    if (this.intervalId) {
      logger.warn('Authorization cleanup job is already running');
      return;
    }

    logger.info(`Starting authorization cleanup job (interval: ${intervalMinutes} minutes)`);

    // 立即执行一次
    this.run();

    // 设置定时执行
    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.run();
    }, intervalMs);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Authorization cleanup job stopped');
    }
  }

  /**
   * 执行清理任务
   */
  async run() {
    if (this.isRunning) {
      logger.warn('Authorization cleanup job is already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const result = await authorizationCleanupService.cleanupExpiredAuthorizations();
      const duration = Date.now() - startTime;
      
      logger.info(`Authorization cleanup completed in ${duration}ms:`, {
        cleaned: result.cleaned,
        refundedQuota: result.refundedQuota,
        errors: result.errors?.length || 0
      });

      if (result.errors && result.errors.length > 0) {
        logger.warn('Some authorizations failed to cleanup:', result.errors);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Authorization cleanup job failed after ${duration}ms:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 手动触发清理（用于测试或管理接口）
   */
  async trigger() {
    return await this.run();
  }
}

// 创建单例
const authorizationCleanupJob = new AuthorizationCleanupJob();

// 如果直接运行此文件，启动任务（用于独立运行）
if (require.main === module) {
  const intervalMinutes = parseInt(process.env.AUTHORIZATION_CLEANUP_INTERVAL_MINUTES) || 5;
  authorizationCleanupJob.start(intervalMinutes);
  
  // 优雅退出
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping authorization cleanup job...');
    authorizationCleanupJob.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping authorization cleanup job...');
    authorizationCleanupJob.stop();
    process.exit(0);
  });
}

module.exports = authorizationCleanupJob;
