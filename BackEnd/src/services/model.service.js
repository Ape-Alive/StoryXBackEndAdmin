const modelRepository = require('../repositories/model.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { MODEL_TYPE } = require('../constants/modelType');

/**
 * 模型业务逻辑层
 */
class ModelService {
  /**
   * 获取模型列表
   */
  async getModels(filters = {}, pagination = {}, sort = {}) {
    return await modelRepository.findModels(filters, pagination, sort);
  }

  /**
   * 获取模型详情
   */
  async getModelDetail(id) {
    const model = await modelRepository.findById(id);
    if (!model) {
      throw new NotFoundError('Model not found');
    }
    return model;
  }

  /**
   * 创建模型
   */
  async createModel(data, adminId = null, ipAddress = null) {
    // 验证模型类型
    if (data.type && !Object.values(MODEL_TYPE).includes(data.type)) {
      throw new BadRequestError('Invalid model type');
    }

    // 检查提供商是否存在
    const prisma = require('../config/database');
    const provider = await prisma.aIProvider.findUnique({
      where: { id: data.providerId }
    });
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    // 检查同一提供商下是否已存在同名模型
    const existing = await modelRepository.findByProviderAndName(data.providerId, data.name);
    if (existing) {
      throw new ConflictError('Model with this name already exists for this provider');
    }

    const model = await modelRepository.create(data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_MODEL',
        targetType: 'model',
        targetId: model.id,
        details: data,
        ipAddress
      });
    }

    return model;
  }

  /**
   * 更新模型
   */
  async updateModel(id, data, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(id);
    if (!model) {
      throw new NotFoundError('Model not found');
    }

    // 验证模型类型
    if (data.type && !Object.values(MODEL_TYPE).includes(data.type)) {
      throw new BadRequestError('Invalid model type');
    }

    // name 和 providerId 不可修改
    if (data.name && data.name !== model.name) {
      throw new BadRequestError('Model name cannot be changed');
    }
    if (data.providerId && data.providerId !== model.providerId) {
      throw new BadRequestError('Model provider cannot be changed');
    }

    const updated = await modelRepository.update(id, data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_MODEL',
        targetType: 'model',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 删除模型
   */
  async deleteModel(id, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(id);
    if (!model) {
      throw new NotFoundError('Model not found');
    }

    await modelRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_MODEL',
        targetType: 'model',
        targetId: id,
        details: { model: model.name },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 批量更新模型状态
   */
  async batchUpdateStatus(ids, isActive, adminId = null, ipAddress = null) {
    const result = await modelRepository.batchUpdateStatus(ids, isActive);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_UPDATE_MODEL_STATUS',
        targetType: 'model',
        targetId: null,
        details: { ids, isActive },
        ipAddress
      });
    }

    return result;
  }

  /**
   * 批量删除模型
   */
  async batchDelete(ids, adminId = null, ipAddress = null) {
    const result = await modelRepository.batchDelete(ids);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_DELETE_MODEL',
        targetType: 'model',
        targetId: null,
        details: { ids },
        ipAddress
      });
    }

    return result;
  }

  /**
   * 获取模型价格列表
   */
  async getModelPrices(modelId, packageId = null) {
    const model = await modelRepository.findById(modelId);
    if (!model) {
      throw new NotFoundError('Model not found');
    }

    return await modelRepository.findPrices(modelId, packageId);
  }

  /**
   * 创建模型价格
   */
  async createModelPrice(data, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(data.modelId);
    if (!model) {
      throw new NotFoundError('Model not found');
    }

    const price = await modelRepository.createPrice(data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_MODEL_PRICE',
        targetType: 'model_price',
        targetId: price.id,
        details: data,
        ipAddress
      });
    }

    return price;
  }

  /**
   * 更新模型价格
   */
  async updateModelPrice(id, data, adminId = null, ipAddress = null) {
    const prisma = require('../config/database');
    const price = await prisma.modelPrice.findUnique({
      where: { id }
    });
    if (!price) {
      throw new NotFoundError('Model price not found');
    }

    const updated = await modelRepository.updatePrice(id, data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_MODEL_PRICE',
        targetType: 'model_price',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 更新模型状态
   */
  async updateModelStatus(id, isActive, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(id);
    if (!model) {
      throw new NotFoundError('Model not found');
    }

    const updated = await modelRepository.update(id, { isActive });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_MODEL_STATUS',
        targetType: 'model',
        targetId: id,
        details: { isActive },
        ipAddress
      });
    }

    return updated;
  }
}

module.exports = new ModelService();
