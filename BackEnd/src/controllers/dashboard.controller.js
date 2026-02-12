const dashboardService = require('../services/dashboard.service');
const ResponseHandler = require('../utils/response');

/**
 * 大盘仪表盘控制器
 */
class DashboardController {
  /**
   * 获取汇总指标
   */
  async getSummaryMetrics(req, res, next) {
    try {
      const data = await dashboardService.getSummaryMetrics();
      return ResponseHandler.success(res, data, 'Summary metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取调用与积分趋势
   */
  async getCallPointsTrend(req, res, next) {
    try {
      const timeRange = req.query.timeRange || '24h';
      const data = await dashboardService.getCallPointsTrend(timeRange);
      return ResponseHandler.success(res, data, 'Call points trend retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取模型负载占比
   */
  async getModelLoadRatio(req, res, next) {
    try {
      const data = await dashboardService.getModelLoadRatio();
      return ResponseHandler.success(res, data, 'Model load ratio retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取提供商健康度
   */
  async getModelProviderHealth(req, res, next) {
    try {
      const data = await dashboardService.getModelProviderHealth();
      return ResponseHandler.success(res, data, 'Provider health retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取最近风控触发记录
   */
  async getRealtimeRiskTriggers(req, res, next) {
    try {
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
      const data = await dashboardService.getRealtimeRiskTriggers(limit);
      return ResponseHandler.success(res, data, 'Realtime risk triggers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
