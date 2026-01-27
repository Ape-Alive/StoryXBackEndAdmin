const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const modelRoutes = require('./src/routes/model.routes');
const providerRoutes = require('./src/routes/provider.routes');
const packageRoutes = require('./src/routes/package.routes');
const userPackageRoutes = require('./src/routes/userPackage.routes');
const quotaRoutes = require('./src/routes/quota.routes');
const promptRoutes = require('./src/routes/prompt.routes');
const riskRoutes = require('./src/routes/risk.routes');
const authorizationRoutes = require('./src/routes/authorization.routes');
const logRoutes = require('./src/routes/log.routes');
const docsRoutes = require('./src/routes/docs.routes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

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
app.use('/api/users', userRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/user/packages', userPackageRoutes);
app.use('/api/quotas', quotaRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/authorization', authorizationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/docs', docsRoutes);

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
