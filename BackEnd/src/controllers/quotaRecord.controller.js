const quotaRecordService = require('../services/quotaRecord.service');
const ResponseHandler = require('../utils/response');

/**
 * 额度流水控制器
 */
class QuotaRecordController {
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
        orderId: req.query.orderId,
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

  /**
   * 获取单条额度流水详情
   */
  async getQuotaRecordDetail(req, res, next) {
    try {
      const { id } = req.params;
      const record = await quotaRecordService.getQuotaRecordById(id);
      return ResponseHandler.success(res, record, 'Quota record retrieved successfully');
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
      const records = await quotaRecordService.getRecordsByRequestId(requestId);
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
        userId: req.body.userId,
        packageId: req.body.packageId,
        type: req.body.type,
        orderId: req.body.orderId,
        createdAt: {
          gte: req.body.startDate,
          lte: req.body.endDate
        }
      };

      const records = await quotaRecordService.exportQuotaRecords(filters);
      return ResponseHandler.success(res, records, 'Quota records exported successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除单条额度流水记录
   */
  async deleteQuotaRecord(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      const result = await quotaRecordService.deleteQuotaRecord(id, adminId, ipAddress);
      return ResponseHandler.success(res, result, 'Quota record deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除额度流水记录
   */
  async batchDeleteQuotaRecords(req, res, next) {
    try {
      const { ids } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      const result = await quotaRecordService.batchDeleteQuotaRecords(ids, adminId, ipAddress);
      return ResponseHandler.success(res, result, 'Quota records deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuotaRecordController();

