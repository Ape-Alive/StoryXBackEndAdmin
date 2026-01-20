const riskService = require('../services/risk.service');
const ResponseHandler = require('../utils/response');

/**
 * 风控控制器
 */
class RiskController {
  /**
   * 获取风控规则列表
   */
  async getRules(req, res, next) {
    try {
      const filters = {
        name: req.query.name,
        isActive: req.query.isActive,
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await riskService.getRules(filters, pagination);

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
   * 获取风控规则详情
   */
  async getRuleDetail(req, res, next) {
    try {
      const { id } = req.params;
      const rule = await riskService.getRuleDetail(id);
      return ResponseHandler.success(res, rule, 'Risk rule detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建风控规则
   */
  async createRule(req, res, next) {
    try {
      const data = req.body;
      const rule = await riskService.createRule(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, rule, 'Risk rule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新风控规则
   */
  async updateRule(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const rule = await riskService.updateRule(id, data, req.user?.id, req.ip);
      return ResponseHandler.success(res, rule, 'Risk rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除风控规则
   */
  async deleteRule(req, res, next) {
    try {
      const { id } = req.params;
      await riskService.deleteRule(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Risk rule deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取风控触发记录
   */
  async getTriggers(req, res, next) {
    try {
      const filters = {
        ruleId: req.query.ruleId,
        userId: req.query.userId,
        modelId: req.query.modelId,
        status: req.query.status,
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await riskService.getTriggers(filters, pagination);

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
   * 获取监控统计数据
   */
  async getMonitorStats(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      const stats = await riskService.getMonitorStats(filters);
      return ResponseHandler.success(res, stats, 'Monitor stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RiskController();
