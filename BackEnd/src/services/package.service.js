const packageRepository = require('../repositories/package.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

/**
 * 套餐业务逻辑层
 */
class PackageService {
  /**
   * 获取套餐列表
   */
  async getPackages(filters = {}, pagination = {}, sort = {}) {
    return await packageRepository.findPackages(filters, pagination, sort);
  }

  /**
   * 获取套餐详情
   */
  async getPackageDetail(id) {
    const pkg = await packageRepository.findById(id);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // 解析 availableModels JSON
    if (pkg.availableModels) {
      try {
        pkg.availableModels = JSON.parse(pkg.availableModels);
      } catch (e) {
        pkg.availableModels = [];
      }
    }

    return pkg;
  }

  /**
   * 创建套餐
   */
  async createPackage(data, adminId = null, ipAddress = null) {
    // 验证套餐类型
    const validTypes = ['free', 'paid', 'trial'];
    if (data.type && !validTypes.includes(data.type)) {
      throw new BadRequestError('Invalid package type');
    }

    // 检查名称是否已存在
    const existing = await packageRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Package name already exists');
    }

    // 验证额度
    if (data.totalQuota !== null && data.totalQuota < 0) {
      throw new BadRequestError('Total quota cannot be negative');
    }
    if (data.totalCalls !== null && data.totalCalls < 0) {
      throw new BadRequestError('Total calls cannot be negative');
    }

    const pkg = await packageRepository.create(data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_PACKAGE',
        targetType: 'package',
        targetId: pkg.id,
        details: data,
        ipAddress
      });
    }

    return pkg;
  }

  /**
   * 更新套餐
   */
  async updatePackage(id, data, adminId = null, ipAddress = null) {
    const pkg = await packageRepository.findById(id);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // 验证套餐类型
    const validTypes = ['free', 'paid', 'trial'];
    if (data.type && !validTypes.includes(data.type)) {
      throw new BadRequestError('Invalid package type');
    }

    // name 不可修改
    if (data.name && data.name !== pkg.name) {
      throw new BadRequestError('Package name cannot be changed');
    }

    // 验证额度
    if (data.totalQuota !== undefined && data.totalQuota !== null && data.totalQuota < 0) {
      throw new BadRequestError('Total quota cannot be negative');
    }
    if (data.totalCalls !== undefined && data.totalCalls !== null && data.totalCalls < 0) {
      throw new BadRequestError('Total calls cannot be negative');
    }

    const updated = await packageRepository.update(id, data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_PACKAGE',
        targetType: 'package',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 删除套餐
   */
  async deletePackage(id, adminId = null, ipAddress = null) {
    const pkg = await packageRepository.findById(id);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // 检查是否有用户使用该套餐
    const hasUsers = await packageRepository.hasUsers(id);
    if (hasUsers) {
      throw new ConflictError('Package is in use, cannot be deleted');
    }

    await packageRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_PACKAGE',
        targetType: 'package',
        targetId: id,
        details: { package: pkg.name },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 复制套餐
   */
  async duplicatePackage(id, newName, newDisplayName, adminId = null, ipAddress = null) {
    const pkg = await packageRepository.findById(id);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // 检查新名称是否已存在
    const existing = await packageRepository.findByName(newName);
    if (existing) {
      throw new ConflictError('Package name already exists');
    }

    const duplicated = await packageRepository.duplicate(id, newName, newDisplayName);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DUPLICATE_PACKAGE',
        targetType: 'package',
        targetId: duplicated.id,
        details: { originalId: id, newName, newDisplayName },
        ipAddress
      });
    }

    return duplicated;
  }
}

module.exports = new PackageService();
