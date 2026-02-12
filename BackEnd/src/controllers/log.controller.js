const logService = require('../services/log.service');
const ResponseHandler = require('../utils/response');
const { NotFoundError } = require('../utils/errors');

/**
 * 日志控制器
 */
class LogController {
  /**
   * 获取管理员操作日志列表
   */
  async getOperationLogs(req, res, next) {
    try {
      const filters = {
        adminId: req.query.adminId,
        action: req.query.action,
        targetType: req.query.targetType,
        targetId: req.query.targetId,
        result: req.query.result,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
      const pagination = { page, pageSize };

      const result = await logService.getOperationLogs(filters, pagination);

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
   * 获取操作日志详情
   */
  async getOperationLogDetail(req, res, next) {
    try {
      const { id } = req.params;
      const log = await logService.getOperationLogDetail(id);
      if (!log) {
        throw new NotFoundError('Operation log not found');
      }
      return ResponseHandler.success(res, log, 'Operation log detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取 AI 调用日志列表
   */
  async getAICallLogs(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        modelId: req.query.modelId,
        status: req.query.status,
        requestId: req.query.requestId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
      const pagination = { page, pageSize };

      const result = await logService.getAICallLogs(filters, pagination);

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
   * 获取 AI 调用日志详情
   */
  async getAICallLogDetail(req, res, next) {
    try {
      const { requestId } = req.params;
      const log = await logService.getAICallLogDetail(requestId);
      if (!log) {
        throw new NotFoundError('AI call log not found');
      }
      return ResponseHandler.success(res, log, 'AI call log detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LogController();
