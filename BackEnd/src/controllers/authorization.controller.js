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
        callToken: req.query.callToken,
        status: req.query.status,
        requestId: req.query.requestId,
        activeOnly: req.query.activeOnly === 'true'
      };

      // 只有在提供了日期参数时才添加 createdAt 过滤
      if (req.query.startDate || req.query.endDate) {
        filters.createdAt = {};
        if (req.query.startDate) {
          filters.createdAt.gte = req.query.startDate;
        }
        if (req.query.endDate) {
          filters.createdAt.lte = req.query.endDate;
        }
      }

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
   * 根据 callToken 获取授权记录
   */
  async getByCallToken(req, res, next) {
    try {
      const { callToken } = req.params;
      const authorization = await authorizationService.getByCallToken(callToken);
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

  /**
   * 获取全部用户的授权统计（支持设备指纹、用户ID、状态、日期范围筛选）
   */
  async getAllUsersAuthorizationStats(req, res, next) {
    try {
      const filters = {
        deviceFingerprint: req.query.deviceFingerprint,
        userId: req.query.userId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      Object.keys(filters).forEach((key) => {
        if (filters[key] === undefined || filters[key] === '') delete filters[key];
      });
      const stats = await authorizationService.getAllUsersAuthorizationStats(filters);
      return ResponseHandler.success(res, stats, 'All users authorization stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthorizationController();
