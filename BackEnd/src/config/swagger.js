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
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Success'
            },
            data: {
              type: 'array',
              items: {
                type: 'object'
              }
            },
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
            }
          }
        },
        Authorization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '授权记录ID',
              example: 'clx123456789'
            },
            userId: {
              type: 'string',
              description: '用户ID',
              example: 'clx987654321'
            },
            modelId: {
              type: 'string',
              description: '模型ID',
              example: 'clx111222333'
            },
            deviceFingerprint: {
              type: 'string',
              description: '设备指纹',
              example: 'device-fingerprint-123'
            },
            ipAddress: {
              type: 'string',
              nullable: true,
              description: 'IP地址',
              example: '192.168.1.1'
            },
            frozenQuota: {
              type: 'number',
              format: 'decimal',
              description: '预冻结额度',
              example: 10.5
            },
            callToken: {
              type: 'string',
              nullable: true,
              description: '调用令牌',
              example: 'abc123def456...'
            },
            status: {
              type: 'string',
              enum: ['active', 'revoked', 'expired', 'used'],
              description: '授权状态',
              example: 'active'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: '过期时间',
              example: '2026-02-11T10:00:00Z'
            },
            requestId: {
              type: 'string',
              nullable: true,
              description: '请求ID',
              example: 'req-123456'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
              example: '2026-02-11T09:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间',
              example: '2026-02-11T09:00:00Z'
            },
            user: {
              type: 'object',
              description: '用户信息',
              properties: {
                id: { type: 'string' },
                email: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true }
              }
            },
            model: {
              type: 'object',
              description: '模型信息',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                displayName: { type: 'string' },
                provider: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    displayName: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        AuthorizationDetail: {
          allOf: [
            { $ref: '#/components/schemas/Authorization' },
            {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  description: '用户完整信息',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string', nullable: true },
                    phone: { type: 'string', nullable: true },
                    role: { type: 'string' },
                    status: { type: 'string' }
                  }
                },
                model: {
                  type: 'object',
                  description: '模型完整信息',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    displayName: { type: 'string' },
                    type: { type: 'string' },
                    category: { type: 'string', nullable: true },
                    baseUrl: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                    apiConfig: { type: 'string', nullable: true },
                    provider: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        displayName: { type: 'string' },
                        baseUrl: { type: 'string' },
                        isActive: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        OperationLog: {
          type: 'object',
          description: '管理员操作日志',
          properties: {
            id: { type: 'string', description: '日志ID', example: 'clx123456789' },
            adminId: { type: 'string', description: '管理员ID' },
            action: { type: 'string', description: '操作类型（CREATE/UPDATE/DELETE/UPDATE_STATUS等）', example: 'UPDATE' },
            targetType: { type: 'string', description: '目标类型（user/model/package等）', example: 'user' },
            targetId: { type: 'string', nullable: true, description: '目标ID' },
            details: { type: 'string', nullable: true, description: '操作详情（JSON）' },
            ipAddress: { type: 'string', nullable: true, description: 'IP地址' },
            result: { type: 'string', enum: ['success', 'failure'], description: '操作结果' },
            errorMessage: { type: 'string', nullable: true, description: '错误信息（失败时）' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            admin: {
              type: 'object',
              description: '管理员信息',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string', nullable: true }
              }
            }
          }
        },
        AICallLog: {
          type: 'object',
          description: 'AI 调用日志',
          properties: {
            id: { type: 'string', description: '日志ID' },
            requestId: { type: 'string', description: '请求ID', example: 'req-abc123' },
            userId: { type: 'string', description: '用户ID' },
            modelId: { type: 'string', description: '模型ID' },
            inputTokens: { type: 'integer', description: '输入 token 数' },
            outputTokens: { type: 'integer', description: '输出 token 数' },
            totalTokens: { type: 'integer', description: '总 token 数' },
            cost: { type: 'number', format: 'decimal', description: '调用成本' },
            status: { type: 'string', enum: ['success', 'failure'], description: '调用状态' },
            errorMessage: { type: 'string', nullable: true, description: '错误信息' },
            requestTime: { type: 'string', format: 'date-time', description: '请求时间' },
            responseTime: { type: 'string', format: 'date-time', nullable: true, description: '响应时间' },
            duration: { type: 'integer', nullable: true, description: '响应耗时（毫秒）' },
            deviceFingerprint: { type: 'string', nullable: true, description: '设备指纹' },
            ipAddress: { type: 'string', nullable: true, description: 'IP地址' },
            user: {
              type: 'object',
              description: '用户信息',
              properties: {
                id: { type: 'string' },
                email: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true }
              }
            },
            model: {
              type: 'object',
              description: '模型信息',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                displayName: { type: 'string', nullable: true },
                provider: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    displayName: { type: 'string' }
                  }
                }
              }
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
