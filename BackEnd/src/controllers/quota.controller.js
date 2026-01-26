const quotaService = require('../services/quota.service');
const ResponseHandler = require('../utils/response');

/**
 * 额度控制器
 */
class QuotaController {
  /**
   * 获取额度列表
   */
  async getQuotas(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await quotaService.getQuotas(filters, pagination);

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
   * 获取用户额度详情
   */
  async getUserQuota(req, res, next) {
    try {
      const { userId } = req.params;
      const { packageId } = req.query;
      const quota = await quotaService.getUserQuota(userId, packageId || null);
      return ResponseHandler.success(res, quota, 'User quota retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户的所有额度
   */
  async getUserQuotas(req, res, next) {
    try {
      const { userId } = req.params;
      const quotas = await quotaService.getUserQuotas(userId);
      return ResponseHandler.success(res, quotas, 'User quotas retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 手动调整额度
   */
  async adjustQuota(req, res, next) {
    try {
      const { userId } = req.params;
      const { packageId, amount, reason } = req.body;
      const quota = await quotaService.adjustQuota(
        userId,
        packageId || null,
        amount || 0,
        reason,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, quota, 'Quota adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取额度流水列表
   */
  async getQuotaRecords(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId,
        type: req.query.type,
        requestId: req.query.requestId,
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await quotaService.getQuotaRecords(filters, pagination);

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
   * 根据 requestId 查询流水
   */
  async getRecordsByRequestId(req, res, next) {
    try {
      const { requestId } = req.params;
      const records = await quotaService.getRecordsByRequestId(requestId);
      return ResponseHandler.success(res, records, 'Quota records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出额度流水
   */
  async exportQuotaRecords(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId,
        type: req.query.type,
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const records = await quotaService.exportQuotaRecords(filters);
      return ResponseHandler.success(res, records, 'Quota records exported successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuotaController();
