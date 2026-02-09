require('dotenv').config();
const app = require('./app');
const authorizationCleanupJob = require('./src/jobs/authorizationCleanup.job');
const apiKeyExpirationJob = require('./src/jobs/apiKeyExpiration.job');
const packageExpirationJob = require('./src/jobs/packageExpiration.job');

const PORT = process.env.PORT || 5800;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 启动定时任务（清理过期授权）
// 可以通过环境变量 AUTHORIZATION_CLEANUP_ENABLED=false 禁用
const cleanupEnabled = process.env.AUTHORIZATION_CLEANUP_ENABLED !== 'false';
if (cleanupEnabled) {
  const intervalMinutes = parseInt(process.env.AUTHORIZATION_CLEANUP_INTERVAL_MINUTES) || 5;
  authorizationCleanupJob.start(intervalMinutes);
  console.log(`✅ Authorization cleanup job started (interval: ${intervalMinutes} minutes)`);
} else {
  console.log('⚠️  Authorization cleanup job is disabled');
}

// 启动API Key过期检查任务
// 可以通过环境变量 ENABLE_API_KEY_EXPIRATION_JOB=false 禁用
const apiKeyExpirationEnabled = process.env.ENABLE_API_KEY_EXPIRATION_JOB !== 'false';
if (apiKeyExpirationEnabled) {
  apiKeyExpirationJob.start();
  console.log('✅ API Key expiration job started');
} else {
  console.log('⚠️  API Key expiration job is disabled');
}

// 启动套餐过期检查任务
// 可以通过环境变量 ENABLE_PACKAGE_EXPIRATION_JOB=false 禁用
const packageExpirationEnabled = process.env.ENABLE_PACKAGE_EXPIRATION_JOB !== 'false';
if (packageExpirationEnabled) {
  packageExpirationJob.start();
  console.log('✅ Package expiration job started');
} else {
  console.log('⚠️  Package expiration job is disabled');
}

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 Server is running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📋 API Spec JSON: http://localhost:${PORT}/api-docs.json`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

// 优雅退出处理
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  if (cleanupEnabled) {
    authorizationCleanupJob.stop();
  }
  if (apiKeyExpirationEnabled) {
    apiKeyExpirationJob.stop();
  }
  if (packageExpirationEnabled) {
    packageExpirationJob.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  if (cleanupEnabled) {
    authorizationCleanupJob.stop();
  }
  if (apiKeyExpirationEnabled) {
    apiKeyExpirationJob.stop();
  }
  if (packageExpirationEnabled) {
    packageExpirationJob.stop();
  }
  process.exit(0);
});
