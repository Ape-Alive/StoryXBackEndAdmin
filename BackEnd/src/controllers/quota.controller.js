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
   * 冻结额度
   */
  async freezeQuota(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const quota = await quotaService.freezeQuota(
        id,
        amount,
        reason,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, quota, 'Quota frozen successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 解冻额度
   */
  async unfreezeQuota(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const quota = await quotaService.unfreezeQuota(
        id,
        amount,
        reason,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, quota, 'Quota unfrozen successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 设置额度
   */
  async setQuota(req, res, next) {
    try {
      const { id } = req.params;
      const { available, frozen, used, reason } = req.body;
      const quota = await quotaService.setQuota(
        id,
        { available, frozen, used, reason },
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, quota, 'Quota set successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 重置额度
   */
  async resetQuota(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const quota = await quotaService.resetQuota(
        id,
        reason,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, quota, 'Quota reset successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量调整额度
   */
  async batchAdjustQuota(req, res, next) {
    try {
      const { items } = req.body;
      const result = await quotaService.batchAdjustQuota(
        items,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, result, 'Batch quota adjustment completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量冻结额度
   */
  async batchFreezeQuota(req, res, next) {
    try {
      const { items } = req.body;
      const result = await quotaService.batchFreezeQuota(
        items,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, result, 'Batch quota freeze completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量解冻额度
   */
  async batchUnfreezeQuota(req, res, next) {
    try {
      const { items } = req.body;
      const result = await quotaService.batchUnfreezeQuota(
        items,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, result, 'Batch quota unfreeze completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取额度统计信息
   */
  async getQuotaStatistics(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId
      };
      const statistics = await quotaService.getQuotaStatistics(filters);
      return ResponseHandler.success(res, statistics, 'Quota statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出额度数据
   */
  async exportQuotas(req, res, next) {
    try {
      const filters = {
        userId: req.body.userId,
        packageId: req.body.packageId
      };
      const format = req.body.format || 'excel';
      const result = await quotaService.exportQuotas(filters, format);
      return ResponseHandler.success(res, result, 'Quota data exported successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取使用趋势统计
   */
  async getUsageTrend(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        period: req.query.period || 'day' // day, week, month
      };
      const result = await quotaService.getUsageTrend(filters);
      return ResponseHandler.success(res, result, 'Usage trend retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取套餐使用排行
   */
  async getPackageRanking(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 10
      };
      const result = await quotaService.getPackageRanking(filters);
      return ResponseHandler.success(res, result, 'Package ranking retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户使用排行
   */
  async getUserRanking(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 10
      };
      const result = await quotaService.getUserRanking(filters);
      return ResponseHandler.success(res, result, 'User ranking retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取使用分布统计
   */
  async getUsageDistribution(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      const result = await quotaService.getUsageDistribution(filters);
      return ResponseHandler.success(res, result, 'Usage distribution retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户详细使用统计
   */
  async getUserUsageStatistics(req, res, next) {
    try {
      const { userId } = req.params;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      const result = await quotaService.getUserUsageStatistics(userId, filters);
      return ResponseHandler.success(res, result, 'User usage statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==================== 终端用户专用接口 ====================

  /**
   * 获取我的额度列表（终端用户）
   */
  async getMyQuotas(req, res, next) {
    try {
      const userId = req.user.id; // 从 token 中获取用户ID
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token'
        });
      }

      const filters = {
        userId: userId, // 强制使用当前登录用户的ID
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
   * 获取我的额度详情（终端用户）
   */
  async getMyQuotaDetail(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token'
        });
      }

      const { packageId } = req.query;
      const quota = await quotaService.getUserQuota(userId, packageId || null);
      return ResponseHandler.success(res, quota, 'My quota detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我的使用统计（终端用户）
   */
  async getMyUsageStatistics(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token'
        });
      }

      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      const result = await quotaService.getUserUsageStatistics(userId, filters);
      return ResponseHandler.success(res, result, 'My usage statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我的使用趋势（终端用户）
   */
  async getMyUsageTrend(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token'
        });
      }

      const filters = {
        userId: userId, // 强制使用当前登录用户的ID
        packageId: req.query.packageId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        period: req.query.period || 'day'
      };
      const result = await quotaService.getUsageTrend(filters);
      return ResponseHandler.success(res, result, 'My usage trend retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我的额度流水（终端用户）
   */
  async getMyQuotaRecords(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token'
        });
      }

      const quotaRecordService = require('../services/quotaRecord.service');
      const filters = {
        userId: userId, // 强制使用当前登录用户的ID
        packageId: req.query.packageId,
        type: req.query.type,
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await quotaRecordService.getQuotaRecords(filters, pagination);
      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new QuotaController();
