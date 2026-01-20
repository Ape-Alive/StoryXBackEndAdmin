const express = require('express');
const router = express.Router();
const swaggerSpec = require('../config/swagger');

/**
 * @swagger
 * /api/docs/spec:
 *   get:
 *     summary: 获取 API 文档规范（用于 ApiFix 拉取）
 *     tags: [API 文档]
 *     description: 返回完整的 OpenAPI 3.0 规范 JSON，可用于 ApiFix 等工具拉取接口定义
 *     responses:
 *       200:
 *         description: 返回 OpenAPI 规范 JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0 规范对象
 *               example:
 *                 openapi: '3.0.0'
 *                 info:
 *                   title: 'AI 能力中台后台管理系统 API'
 *                   version: '1.0.0'
 *                 paths: {}
 *                 components: {}
 */
router.get('/spec', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /api/docs/paths:
 *   get:
 *     summary: 获取所有 API 路径列表
 *     tags: [API 文档]
 *     description: 返回所有 API 路径的简化列表，用于快速查看所有接口
 *     responses:
 *       200:
 *         description: 返回路径列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     paths:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/paths', (req, res) => {
  const paths = Object.keys(swaggerSpec.paths || {}).map(path => {
    const pathObj = swaggerSpec.paths[path];
    const methods = Object.keys(pathObj).filter(key =>
      ['get', 'post', 'put', 'patch', 'delete'].includes(key.toLowerCase())
    );

    return methods.map(method => ({
      path,
      method: method.toUpperCase(),
      summary: pathObj[method]?.summary || '',
      tags: pathObj[method]?.tags || [],
      security: pathObj[method]?.security || []
    }));
  }).flat();

  res.json({
    success: true,
    message: 'API paths retrieved successfully',
    data: {
      paths,
      total: paths.length
    }
  });
});

module.exports = router;
