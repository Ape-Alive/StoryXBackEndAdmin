const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { ipExtractor } = require('./src/middleware/ipExtractor');
const logger = require('./src/utils/logger');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const userRoutes = require('./src/routes/user.routes');
const modelRoutes = require('./src/routes/model.routes');
const providerRoutes = require('./src/routes/provider.routes');
const packageRoutes = require('./src/routes/package.routes');
const userPackageRoutes = require('./src/routes/userPackage.routes');
const deviceRoutes = require('./src/routes/device.routes');
const adminDeviceRoutes = require('./src/routes/adminDevice.routes');
const quotaRoutes = require('./src/routes/quota.routes');
const quotaRecordRoutes = require('./src/routes/quotaRecord.routes');
const userQuotaRoutes = require('./src/routes/userQuota.routes');
const promptRoutes = require('./src/routes/prompt.routes');
const riskRoutes = require('./src/routes/risk.routes');
const authorizationRoutes = require('./src/routes/authorization.routes');
const logRoutes = require('./src/routes/log.routes');
const docsRoutes = require('./src/routes/docs.routes');
const orderRoutes = require('./src/routes/order.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const paymentCallbackRoutes = require('./src/routes/paymentCallback.routes');
const userApiRoutes = require('./src/routes/userApi.routes');
const userApiKeyRoutes = require('./src/routes/userApiKey.routes');

const app = express();

// Trust proxy settings (if behind proxy/load balancer)
// 如果部署在 Nginx、负载均衡器等代理后面，需要设置此项
// 设置为 true 表示信任第一个代理，设置为数字表示信任的代理层数
// 设置为 IP 地址或 IP 段表示信任的代理 IP
app.set('trust proxy', process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1' || false);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3001', 'http://localhost:3020'];
    
    // 开发环境允许所有本地端口，生产环境需要明确配置
    if (process.env.NODE_ENV === 'development') {
      // 允许所有 localhost 端口
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
        return;
      }
    }
    
    // 检查是否在允许列表中
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
// 注意：支付回调可能使用 form-urlencoded 格式，需要支持
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// IP 提取中间件（在所有路由之前）
app.use(ipExtractor);

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI 能力中台后台管理系统 API 文档'
}));

// API 文档 JSON 接口（用于 ApiFix 拉取）
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/user/packages', userPackageRoutes);
app.use('/api/user/devices', deviceRoutes);
app.use('/api/devices', adminDeviceRoutes);
app.use('/api/quotas', quotaRoutes); // 管理员额度管理接口
app.use('/api/quota-records', quotaRecordRoutes); // 管理员额度流水接口
app.use('/api/user/quotas', userQuotaRoutes); // 终端用户额度查询接口
app.use('/api/prompts', promptRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/authorization', authorizationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/user/orders', orderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/user', paymentRoutes);
app.use('/api/payment/callback', paymentCallbackRoutes);
app.use('/api/user', userApiRoutes);
app.use('/api/user/api-keys', userApiKeyRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
