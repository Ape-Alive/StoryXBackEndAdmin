const authorizationService = require('../services/authorization.service');
const aiCallService = require('../services/aiCall.service');
const ResponseHandler = require('../utils/response');

/**
 * 用户端API控制器
 */
class UserApiController {
  /**
   * 申请调用授权
   */
  async requestAuthorization(req, res, next) {
    try {
      const userId = req.user.id;
      const { modelId, deviceFingerprint, estimatedTokens = 0 } = req.body;
      const ipAddress = req.ip;

      const result = await authorizationService.requestAuthorization(
        userId,
        modelId,
        deviceFingerprint,
        estimatedTokens,
        ipAddress
      );

      return ResponseHandler.success(res, result, 'Authorization requested successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上报调用结果
   */
  async reportCall(req, res, next) {
    try {
      const {
        callToken,
        requestId,
        inputTokens = 0,
        outputTokens = 0,
        totalTokens = 0,
        status,
        errorMessage = null,
        duration = null,
        responseTime = null
      } = req.body;

      const result = await aiCallService.reportCall(
        callToken,
        requestId,
        inputTokens,
        outputTokens,
        totalTokens,
        status,
        errorMessage,
        duration,
        responseTime
      );

      return ResponseHandler.success(res, result, 'Call reported successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我的授权列表
   */
  async getMyAuthorizations(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        userId,
        modelId: req.query.modelId,
        status: req.query.status,
        activeOnly: req.query.activeOnly === 'true'
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
   * 取消授权
   */
  async cancelAuthorization(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await authorizationService.cancelAuthorization(id, userId);

      return ResponseHandler.success(res, result, 'Authorization cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取调用日志列表
   */
  async getCallLogs(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        modelId: req.query.modelId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await aiCallService.getUserCallLogs(userId, filters, pagination);

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
   * 获取调用日志详情
   */
  async getCallLogDetail(req, res, next) {
    try {
      const userId = req.user.id;
      const { requestId } = req.params;

      const log = await aiCallService.getCallLogDetail(requestId, userId);

      return ResponseHandler.success(res, log, 'Call log retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserApiController();
