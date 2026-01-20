const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI 能力中台后台管理系统 API',
      version: '1.0.0',
      description: 'AI 能力中台后台管理系统后端 API 文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5800}`,
        description: '开发环境'
      },
      {
        url: 'https://api.example.com',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '输入 JWT Token，格式：Bearer {token}'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Success message'
            },
            data: {
              type: 'object'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            pageSize: {
              type: 'integer',
              example: 20
            },
            total: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 5
            }
          }
        }
      }
    },
    tags: [
      {
        name: '认证',
        description: '管理员认证相关接口'
      },
      {
        name: '用户管理',
        description: '终端用户管理接口'
      },
      {
        name: '提供商管理',
        description: 'AI 模型提供商管理接口'
      },
      {
        name: '模型管理',
        description: 'AI 模型管理接口'
      },
      {
        name: '套餐管理',
        description: '套餐管理接口'
      },
      {
        name: '额度管理',
        description: '额度管理接口'
      },
      {
        name: '提示词库',
        description: '提示词库管理接口'
      },
      {
        name: '风控监控',
        description: '风控与监控接口'
      },
      {
        name: '授权管理',
        description: '授权与调用管理接口'
      },
      {
        name: '日志审计',
        description: '日志与审计接口'
      },
      {
        name: 'API 文档',
        description: 'API 文档相关接口'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
