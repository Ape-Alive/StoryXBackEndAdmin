const quotaRecordRepository = require('../repositories/quotaRecord.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * 额度流水业务逻辑层
 */
class QuotaRecordService {
  /**
   * 获取额度流水列表
   */
  async getQuotaRecords(filters = {}, pagination = {}) {
    return await quotaRecordRepository.findRecords(filters, pagination);
  }

  /**
   * 根据 requestId 查询流水
   */
  async getRecordsByRequestId(requestId) {
    const records = await quotaRecordRepository.findByRequestId(requestId);
    if (records.length === 0) {
      throw new NotFoundError('No records found for this request ID');
    }
    return records;
  }

  /**
   * 根据ID获取单条流水记录
   */
  async getQuotaRecordById(id) {
    const record = await quotaRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError('Quota record not found');
    }
    return record;
  }

  /**
   * 导出额度流水
   */
  async exportQuotaRecords(filters = {}) {
    return await quotaRecordRepository.exportRecords(filters);
  }

  /**
   * 删除单条额度流水记录
   * 注意：删除流水记录需要谨慎，建议只允许超级管理员操作
   */
  async deleteQuotaRecord(id, adminId = null, ipAddress = null) {
    const record = await quotaRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError('Quota record not found');
    }

    // 删除记录
    await quotaRecordRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_QUOTA_RECORD',
        targetType: 'quota_record',
        targetId: id,
        details: {
          userId: record.userId,
          type: record.type,
          amount: record.amount,
          reason: record.reason
        },
        ipAddress
      });
    }

    logger.info('Quota record deleted', {
      recordId: id,
      userId: record.userId,
      adminId,
      ipAddress
    });

    return { success: true, message: 'Quota record deleted successfully' };
  }

  /**
   * 批量删除额度流水记录
   */
  async batchDeleteQuotaRecords(ids, adminId = null, ipAddress = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('IDs array is required and cannot be empty');
    }

    // 检查所有记录是否存在
    const records = await quotaRecordRepository.findByIds(ids);
    if (records.length !== ids.length) {
      throw new NotFoundError('Some quota records not found');
    }

    // 批量删除
    const deletedCount = await quotaRecordRepository.batchDelete(ids);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_DELETE_QUOTA_RECORDS',
        targetType: 'quota_record',
        targetId: ids.join(','),
        details: {
          count: deletedCount,
          ids
        },
        ipAddress
      });
    }

    logger.info('Quota records batch deleted', {
      count: deletedCount,
      adminId,
      ipAddress
    });

    return {
      success: true,
      message: 'Quota records deleted successfully',
      count: deletedCount
    };
  }
}

module.exports = new QuotaRecordService();

