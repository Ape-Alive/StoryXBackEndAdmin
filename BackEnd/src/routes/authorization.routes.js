const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/authorization.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES } = require('../constants/roles');

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/authorization:
 *   get:
 *     summary: 获取授权记录列表
 *     tags: [授权管理]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    authorizationController.getAuthorizations.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/{id}:
 *   get:
 *     summary: 获取授权记录详情
 *     tags: [授权管理]
 *   delete:
 *     summary: 撤销授权
 *     tags: [授权管理]
 */
router.get(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    validate,
    authorizationController.getAuthorizationDetail.bind(authorizationController)
);

router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
    validate,
    authorizationController.revokeAuthorization.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/session/{sessionToken}:
 *   get:
 *     summary: 根据 sessionToken 获取授权记录
 *     tags: [授权管理]
 */
router.get(
    '/session/:sessionToken',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    validate,
    authorizationController.getBySessionToken.bind(authorizationController)
);

/**
 * @swagger
 * /api/authorization/users/{userId}/stats:
 *   get:
 *     summary: 获取用户授权统计
 *     tags: [授权管理]
 */
router.get(
    '/users/:userId/stats',
    authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.READ_ONLY),
    validate,
    authorizationController.getUserAuthorizationStats.bind(authorizationController)
);

module.exports = router;
