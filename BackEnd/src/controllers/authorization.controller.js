const authorizationService = require('../services/authorization.service');
const ResponseHandler = require('../utils/response');

/**
 * 授权控制器
 */
class AuthorizationController {
  /**
   * 获取授权记录列表
   */
  async getAuthorizations(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        modelId: req.query.modelId,
        sessionToken: req.query.sessionToken,
        status: req.query.status,
        requestId: req.query.requestId,
        activeOnly: req.query.activeOnly === 'true',
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await authorizationService.getAuthorizations(filters, pagination);

      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取授权记录详情
   */
  async getAuthorizationDetail(req, res, next) {
    try {
      const { id } = req.params;
      const authorization = await authorizationService.getAuthorizationDetail(id);
      return ResponseHandler.success(res, authorization, 'Authorization detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据 sessionToken 获取授权记录
   */
  async getBySessionToken(req, res, next) {
    try {
      const { sessionToken } = req.params;
      const authorization = await authorizationService.getBySessionToken(sessionToken);
      return ResponseHandler.success(res, authorization, 'Authorization retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 撤销授权
   */
  async revokeAuthorization(req, res, next) {
    try {
      const { id } = req.params;
      await authorizationService.revokeAuthorization(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Authorization revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户授权统计
   */
  async getUserAuthorizationStats(req, res, next) {
    try {
      const { userId } = req.params;
      const stats = await authorizationService.getUserAuthorizationStats(userId);
      return ResponseHandler.success(res, stats, 'Authorization stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthorizationController();
