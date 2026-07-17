const providerRepository = require('../repositories/provider.repository');
const prisma = require('../config/database');
const {
  TARGET_TYPES,
  buildVisibleWhereForRole,
  enrichItemsWithRoleBindings,
  enrichItemWithRoleBindings,
  parseOptionalRoleBindingInput,
  applyRoleBindingFields,
  mergeWhereWithRoleVisibility,
} = require('../utils/catalogRoleBinding');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

/**
 * 提供商业务逻辑层
 */
class ProviderService {
  /**
   * 获取提供商列表
   */
  async getProviders(filters = {}, pagination = {}, sort = {}, catalogRoleContext = null) {
    let roleVisibilityWhere = null;
    if (catalogRoleContext) {
      roleVisibilityWhere = await buildVisibleWhereForRole(
        TARGET_TYPES.AI_PROVIDER,
        catalogRoleContext.effectiveRoleId,
      );
    }

    const result = await providerRepository.findProviders(
      filters,
      pagination,
      sort,
      roleVisibilityWhere,
    );
    result.data = await enrichItemsWithRoleBindings(TARGET_TYPES.AI_PROVIDER, result.data);
    return result;
  }

  /**
   * 获取提供商详情
   */
  async getProviderDetail(id, catalogRoleContext = null) {
    const provider = await providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    if (catalogRoleContext) {
      const roleVisibilityWhere = await buildVisibleWhereForRole(
        TARGET_TYPES.AI_PROVIDER,
        catalogRoleContext.effectiveRoleId,
      );
      const visible = await prisma.aIProvider.findFirst({
        where: mergeWhereWithRoleVisibility({ id }, roleVisibilityWhere),
      });
      if (!visible) {
        throw new NotFoundError('Provider not found');
      }
    }

    let enriched = provider;
    if (provider.userApiKeys) {
      const keys = provider.userApiKeys || []
      const limitedKeys = keys.filter((k) => Number(k.credits) > 0)
      const unlimitedKeys = keys.filter((k) => Number(k.credits) <= 0)
      const quotaIsUnlimited = unlimitedKeys.length > 0 && limitedKeys.length === 0
      const quota = limitedKeys.reduce((sum, k) => {
        const credits = Number(k.credits) || 0
        const used = Number(k.usedCredits) || 0
        return sum + Math.max(0, credits - used)
      }, 0)
      const { userApiKeys, ...rest } = provider;
      enriched = { ...rest, quota: quotaIsUnlimited ? null : quota, quotaIsUnlimited };
    }
    return enrichItemWithRoleBindings(TARGET_TYPES.AI_PROVIDER, enriched);
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

    const bindingInput = parseOptionalRoleBindingInput(data);
    const provider = await prisma.$transaction(async tx => {
      const created = await tx.aIProvider.create({
        data: {
          name: data.name,
          displayName: data.displayName,
          baseUrl: data.baseUrl,
          website: data.website,
          logoUrl: data.logoUrl,
          description: data.description,
          quota: null,
          quotaUnit: data.quotaUnit || null,
          mainAccountToken: data.mainAccountToken || null,
          supportsApiKeyCreation: data.supportsApiKeyCreation !== undefined ? data.supportsApiKeyCreation : false,
          apiKeyCreationConfig: data.apiKeyCreationConfig || null,
          apiKeys: data.apiKeys || null,
          apiKeyLowBalanceThreshold:
            data.apiKeyLowBalanceThreshold !== undefined ? data.apiKeyLowBalanceThreshold : 1000,
          voiceCloneApis: data.voiceCloneApis || null,
          voiceCloneCreditsPerCall:
            data.voiceCloneCreditsPerCall !== undefined && data.voiceCloneCreditsPerCall !== null
              ? data.voiceCloneCreditsPerCall
              : 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
          clientRoleBindAll: bindingInput?.clientRoleBindAll ?? true,
        },
      });

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.AI_PROVIDER, created.id, data, tx.aIProvider);
      }

      return created;
    });

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

    return enrichItemWithRoleBindings(TARGET_TYPES.AI_PROVIDER, provider);
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

    const bindingInput = parseOptionalRoleBindingInput(data);
    const updated = await prisma.$transaction(async tx => {
      const row = await providerRepository.update(id, {
        ...data,
        ...(bindingInput ? { clientRoleBindAll: bindingInput.clientRoleBindAll } : {}),
      }, tx);

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.AI_PROVIDER, id, data, tx.aIProvider);
      }

      return row;
    });

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

    return enrichItemWithRoleBindings(TARGET_TYPES.AI_PROVIDER, updated);
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
