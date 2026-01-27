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
    // null 或空数组表示所有模型都可用
    if (pkg.availableModels) {
      try {
        const parsed = JSON.parse(pkg.availableModels);
        pkg.availableModels = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
      } catch (e) {
        pkg.availableModels = null; // 解析失败时视为所有模型都可用
      }
    } else {
      pkg.availableModels = null; // 明确设置为 null 表示所有模型都可用
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
    if (data.quota !== null && data.quota !== undefined && data.quota < 0) {
      throw new BadRequestError('Quota cannot be negative');
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
    if (data.quota !== undefined && data.quota !== null && data.quota < 0) {
      throw new BadRequestError('Quota cannot be negative');
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

  /**
   * 更新套餐状态
   */
  async updatePackageStatus(id, isActive, adminId = null, ipAddress = null) {
    const pkg = await packageRepository.findById(id);
    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    const updated = await packageRepository.update(id, { isActive });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_PACKAGE_STATUS',
        targetType: 'package',
        targetId: id,
        details: { isActive },
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 批量更新套餐状态
   */
  async batchUpdateStatus(ids, isActive, adminId = null, ipAddress = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('IDs array is required');
    }

    const result = await packageRepository.batchUpdate(ids, { isActive });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_UPDATE_PACKAGE_STATUS',
        targetType: 'package',
        targetId: null,
        details: { ids, isActive },
        ipAddress
      });
    }

    return {
      updated: result.count,
      ids: result.ids
    };
  }

  /**
   * 批量删除套餐
   */
  async batchDeletePackages(ids, adminId = null, ipAddress = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('IDs array is required');
    }

    // 检查是否有套餐正在使用
    const packagesInUse = await packageRepository.findPackagesInUse(ids);
    if (packagesInUse.length > 0) {
      throw new ConflictError(`Packages in use: ${packagesInUse.join(', ')}`);
    }

    const result = await packageRepository.batchDelete(ids);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_DELETE_PACKAGES',
        targetType: 'package',
        targetId: null,
        details: { ids },
        ipAddress
      });
    }

    return {
      deleted: result.count,
      ids: result.ids
    };
  }
}

module.exports = new PackageService();
