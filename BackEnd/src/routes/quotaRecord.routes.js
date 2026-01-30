const express = require('express');
const router = express.Router();
const quotaRecordController = require('../controllers/quotaRecord.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, param, query } = require('express-validator');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: 额度流水管理
 *   description: 额度流水记录相关接口
 */

/**
 * @swagger
 * /api/quota-records:
 *   get:
 *     summary: 获取额度流水列表 [super_admin, platform_admin, finance, read_only]
 *     description: 查询额度流水记录，支持多条件筛选和分页
 *     tags: [额度流水管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID筛选
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: 套餐ID筛选
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: 订单ID筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [increase, decrease, freeze, unfreeze]
 *         description: 流水类型筛选（increase=增加，decrease=减少，freeze=冻结，unfreeze=解冻）
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *         description: 请求ID筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 流水记录ID
 *                         example: "clx123456789"
 *                       userId:
 *                         type: string
 *                         description: 用户ID
 *                       packageId:
 *                         type: string
 *                         nullable: true
 *                         description: 套餐ID
 *                       orderId:
 *                         type: string
 *                         nullable: true
 *                         description: 订单ID
 *                       type:
 *                         type: string
 *                         enum: [increase, decrease, freeze, unfreeze]
 *                         description: 流水类型
 *                       amount:
 *                         type: number
 *                         format: decimal
 *                         description: 变动额度（积分）
 *                         example: 100.00
 *                       before:
 *                         type: number
 *                         format: decimal
 *                         description: 变动前额度
 *                         example: 500.00
 *                       after:
 *                         type: number
 *                         format: decimal
 *                         description: 变动后额度
 *                         example: 600.00
 *                       reason:
 *                         type: string
 *                         nullable: true
 *                         description: 变动原因
 *                       requestId:
 *                         type: string
 *                         nullable: true
 *                         description: 关联的请求ID
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                       package:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
  quotaRecordController.getQuotaRecords.bind(quotaRecordController)
);

/**
 * @swagger
 * /api/quota-records/{id}:
 *   get:
 *     summary: 获取额度流水详情 [super_admin, platform_admin, finance, read_only]
 *     description: 获取单条额度流水记录的详细信息
 *     tags: [额度流水管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 流水记录ID
 *         example: "clx123456789"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Quota record retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: 流水记录详情（包含关联的用户、套餐、订单信息）
 *       404:
 *         description: 流水记录不存在
 *   delete:
 *     summary: 删除额度流水记录 [super_admin, platform_admin]
 *     description: 删除单条额度流水记录
 *     tags: [额度流水管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 流水记录ID
 *         example: "clx123456789"
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Quota record deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 流水记录不存在
 */
router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
  [
    param('id').notEmpty().withMessage('Record ID is required')
  ],
  validate,
  quotaRecordController.getQuotaRecordDetail.bind(quotaRecordController)
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
  [
    param('id').notEmpty().withMessage('Record ID is required')
  ],
  validate,
  quotaRecordController.deleteQuotaRecord.bind(quotaRecordController)
);

/**
 * @swagger
 * /api/quota-records/request/{requestId}:
 *   get:
 *     summary: 根据 requestId 查询流水 [super_admin, platform_admin, finance, read_only]
 *     description: 根据请求ID查询相关的所有额度流水记录
 *     tags: [额度流水管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: 请求ID
 *         example: "req_123456789"
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Quota records retrieved successfully"
 *                 data:
 *                   type: array
 *                   description: 流水记录列表（按创建时间正序）
 *                   items:
 *                     type: object
 *       404:
 *         description: 未找到相关流水记录
 */
router.get(
  '/request/:requestId',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE, ROLES.READ_ONLY),
  [
    param('requestId').notEmpty().withMessage('Request ID is required')
  ],
  validate,
  quotaRecordController.getRecordsByRequestId.bind(quotaRecordController)
);

/**
 * @swagger
 * /api/quota-records/export:
 *   post:
 *     summary: 导出额度流水 [super_admin, platform_admin, finance]
 *     description: 根据筛选条件导出额度流水记录
 *     tags: [额度流水管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 用户ID筛选
 *               packageId:
 *                 type: string
 *                 description: 套餐ID筛选
 *               orderId:
 *                 type: string
 *                 description: 订单ID筛选
 *               type:
 *                 type: string
 *                 enum: [increase, decrease, freeze, unfreeze]
 *                 description: 流水类型筛选
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: 开始时间
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: 结束时间
 *     responses:
 *       200:
 *         description: 导出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Quota records exported successfully"
 *                 data:
 *                   type: array
 *                   description: 流水记录列表
 *                   items:
 *                     type: object
 */
router.post(
  '/export',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.FINANCE),
  quotaRecordController.exportQuotaRecords.bind(quotaRecordController)
);

/**
 * @swagger
 * /api/quota-records/batch:
 *   delete:
 *     summary: 批量删除额度流水记录 [super_admin, platform_admin]
 *     description: 批量删除额度流水记录
 *     tags: [额度流水管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 流水记录ID数组
 *                 example: ["clx123456789", "clx987654321"]
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Quota records deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     count:
 *                       type: integer
 *                       description: 删除的记录数量
 *                       example: 2
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 部分流水记录不存在
 */
router.delete(
  '/batch',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
  [
    body('ids')
      .isArray({ min: 1 })
      .withMessage('IDs array is required and cannot be empty')
      .custom((ids) => {
        if (!ids.every(id => typeof id === 'string' && id.length > 0)) {
          throw new Error('All IDs must be non-empty strings');
        }
        return true;
      })
  ],
  validate,
  quotaRecordController.batchDeleteQuotaRecords.bind(quotaRecordController)
);

module.exports = router;

