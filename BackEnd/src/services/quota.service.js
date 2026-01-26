const quotaRepository = require('../repositories/quota.repository');
const quotaRecordRepository = require('../repositories/quotaRecord.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const prisma = require('../config/database');

/**
 * 额度业务逻辑层
 */
class QuotaService {
  /**
   * 获取额度列表
   */
  async getQuotas(filters = {}, pagination = {}) {
    return await quotaRepository.findQuotas(filters, pagination);
  }

  /**
   * 获取用户额度详情
   */
  async getUserQuota(userId, packageId = null) {
    const quota = await quotaRepository.findByUserAndPackage(userId, packageId);
    if (!quota) {
      throw new NotFoundError('Quota not found');
    }
    return quota;
  }

  /**
   * 获取用户的所有额度
   */
  async getUserQuotas(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return await quotaRepository.findByUser(userId);
  }

  /**
   * 手动调整额度（管理员操作）
   */
  async adjustQuota(userId, packageId, amount, reason, adminId = null, ipAddress = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 获取当前额度
    let quota = await quotaRepository.findByUserAndPackage(userId, packageId);

    const before = quota ? quota.available : 0;
    const newAmount = before + amount;

    if (newAmount < 0) {
      throw new BadRequestError('Resulting quota cannot be negative');
    }

    // 更新或创建额度
    quota = await quotaRepository.upsertQuota(userId, packageId, {
      available: newAmount
    });

    // 记录流水
    const recordType = amount >= 0 ? 'increase' : 'decrease';
    await quotaRecordRepository.create({
      userId,
      packageId,
      type: recordType,
      amount: Math.abs(amount),
      before,
      after: newAmount,
      reason: reason || `Manual adjustment by admin`
    });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'ADJUST_QUOTA',
        targetType: 'quota',
        targetId: quota.id,
        details: { userId, packageId, amount, reason },
        ipAddress
      });
    }

    return quota;
  }

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
   * 导出额度流水
   */
  async exportQuotaRecords(filters = {}) {
    return await quotaRecordRepository.exportRecords(filters);
  }
}

module.exports = new QuotaService();
