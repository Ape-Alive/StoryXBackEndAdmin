const providerRepository = require('../repositories/provider.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

/**
 * 提供商业务逻辑层
 */
class ProviderService {
  /**
   * 获取提供商列表
   */
  async getProviders(filters = {}, pagination = {}, sort = {}) {
    return await providerRepository.findProviders(filters, pagination, sort);
  }

  /**
   * 获取提供商详情
   */
  async getProviderDetail(id) {
    const provider = await providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }
    return provider;
  }

  /**
   * 创建提供商
   */
  async createProvider(data, adminId = null, ipAddress = null) {
    // 检查名称是否已存在
    const existing = await providerRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Provider name already exists');
    }

    // 验证 baseUrl 格式
    if (data.baseUrl) {
      try {
        new URL(data.baseUrl);
      } catch (error) {
        throw new BadRequestError('Invalid baseUrl format');
      }
    }

    const provider = await providerRepository.create(data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_PROVIDER',
        targetType: 'provider',
        targetId: provider.id,
        details: data,
        ipAddress
      });
    }

    return provider;
  }

  /**
   * 更新提供商
   */
  async updateProvider(id, data, adminId = null, ipAddress = null) {
    const provider = await providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    // name 不可修改
    if (data.name && data.name !== provider.name) {
      throw new BadRequestError('Provider name cannot be changed');
    }

    // 验证 baseUrl 格式
    if (data.baseUrl) {
      try {
        new URL(data.baseUrl);
      } catch (error) {
        throw new BadRequestError('Invalid baseUrl format');
      }
    }

    const updated = await providerRepository.update(id, data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_PROVIDER',
        targetType: 'provider',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 删除提供商
   */
  async deleteProvider(id, adminId = null, ipAddress = null) {
    const provider = await providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    // 检查是否有关联模型
    const hasModels = await providerRepository.hasModels(id);
    if (hasModels) {
      throw new ConflictError('Provider has associated models, please delete or transfer models first');
    }

    await providerRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_PROVIDER',
        targetType: 'provider',
        targetId: id,
        details: { provider: provider.name },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 更新提供商状态
   */
  async updateProviderStatus(id, isActive, adminId = null, ipAddress = null) {
    const provider = await providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    const updated = await providerRepository.updateStatus(id, isActive);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_PROVIDER_STATUS',
        targetType: 'provider',
        targetId: id,
        details: { isActive },
        ipAddress
      });
    }

    return updated;
  }
}

module.exports = new ProviderService();
