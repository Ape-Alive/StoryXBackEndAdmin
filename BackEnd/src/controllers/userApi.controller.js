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
      const { modelId, userApiKeyId, deviceFingerprint, estimatedTokens = 0, estimatedChars } = req.body;
      const ipAddress = req.ip;

      // char 计价兼容：若传入 estimatedChars，则用它作为预估量（传给计费计算器）
      const normalizedEstimated = estimatedChars !== undefined ? estimatedChars : estimatedTokens;

      const result = await authorizationService.requestAuthorization(
        userId,
        modelId,
        deviceFingerprint,
        normalizedEstimated,
        ipAddress,
        userApiKeyId
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
        usedChars,
        inputChars,
        outputChars,
        totalChars,
        status,
        errorMessage = null,
        duration = null,
        responseTime = null
      } = req.body;

      // char 计价推荐：usedChars 单字段；兼容旧 inputChars/outputChars/totalChars；token 计价仍用 inputTokens/outputTokens
      // priceCalculator.calculateActualCost 的签名为 (inputTokens, outputTokens)，在 pricingType=char 时会把它们当作 chars
      let normalizedInput = inputTokens
      let normalizedOutput = outputTokens
      let normalizedTotal = totalTokens

      if (usedChars !== undefined) {
        normalizedInput = usedChars
        normalizedOutput = 0
        normalizedTotal = usedChars
      } else {
        normalizedInput = inputChars !== undefined ? inputChars : inputTokens
        normalizedOutput = outputChars !== undefined ? outputChars : outputTokens
        normalizedTotal =
          totalChars !== undefined ? totalChars : totalTokens || normalizedInput + normalizedOutput
      }

      const result = await aiCallService.reportCall(
        callToken,
        requestId,
        normalizedInput,
        normalizedOutput,
        normalizedTotal,
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
        logType: req.query.logType,
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
