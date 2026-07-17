const modelRepository = require('../repositories/model.repository')
const prisma = require('../config/database')
const userEntitlementService = require('./userEntitlement.service')
const {
  TARGET_TYPES,
  buildVisibleWhereForRole,
  enrichItemsWithRoleBindings,
  enrichItemWithRoleBindings,
  parseOptionalRoleBindingInput,
  resolveBindingForCreate,
  applyRoleBindingFields,
  mergeWhereWithRoleVisibility,
} = require('../utils/catalogRoleBinding')
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors')
const { MODEL_TYPE } = require('../constants/modelType')

async function buildTerminalModelVisibilityWhere(catalogRoleContext) {
  if (!catalogRoleContext) return null

  const roleVisibilityWhere = await buildVisibleWhereForRole(
    TARGET_TYPES.AI_MODEL,
    catalogRoleContext.effectiveRoleId,
  )
  const availableWhere = await userEntitlementService.getAvailableModelsWhereForUser(
    catalogRoleContext.userId,
  )
  return mergeWhereWithRoleVisibility(roleVisibilityWhere || {}, availableWhere)
}

async function syncVoiceProfilesSupportsVoiceCommandForModel(model) {
  const prisma = require('../config/database')
  const enabled = model.type === MODEL_TYPE.TTS && model.supportsVoiceCommand === true
  await prisma.voiceProfile.updateMany({
    where: { models: { some: { modelId: model.id } } },
    data: { supportsVoiceCommand: enabled },
  })
}

/**
 * 模型业务逻辑层
 */
class ModelService {
  /**
   * 获取模型列表
   */
  async getModels(filters = {}, pagination = {}, sort = {}, catalogRoleContext = null) {
    const visibilityWhere = await buildTerminalModelVisibilityWhere(catalogRoleContext)
    const result = await modelRepository.findModels(filters, pagination, sort, visibilityWhere)
    result.data = await enrichItemsWithRoleBindings(TARGET_TYPES.AI_MODEL, result.data)
    return result
  }

  /**
   * 获取模型详情
   */
  async getModelDetail(id, catalogRoleContext = null) {
    const model = await modelRepository.findById(id)
    if (!model) {
      throw new NotFoundError('Model not found')
    }

    if (catalogRoleContext) {
      const visibilityWhere = await buildTerminalModelVisibilityWhere(catalogRoleContext)
      const visible = await prisma.aIModel.findFirst({
        where: mergeWhereWithRoleVisibility({ id }, visibilityWhere),
      })
      if (!visible) {
        throw new NotFoundError('Model not found')
      }
    }

    return enrichItemWithRoleBindings(TARGET_TYPES.AI_MODEL, model)
  }

  /**
   * 创建模型
   */
  async createModel(data, adminId = null, ipAddress = null) {
    // 验证模型类型
    if (data.type && !Object.values(MODEL_TYPE).includes(data.type)) {
      throw new BadRequestError('Invalid model type')
    }

    // 检查提供商是否存在
    const prisma = require('../config/database')
    const provider = await prisma.aIProvider.findUnique({
      where: { id: data.providerId },
    })
    if (!provider) {
      throw new NotFoundError('Provider not found')
    }

    // 检查同一提供商下是否已存在同名模型
    const existing = await modelRepository.findByProviderAndName(data.providerId, data.name)
    if (existing) {
      throw new ConflictError('Model with this name already exists for this provider')
    }

    const bindingInput = await resolveBindingForCreate(data, {
      defaultBindAll: false,
      defaultRoleKey: 'package_paid_user',
    })
    const model = await prisma.$transaction(async tx => {
      const created = await tx.aIModel.create({
        data: {
          name: data.name,
          displayName: data.displayName,
          type: data.type,
          category: data.category,
          providerId: data.providerId,
          baseUrl: data.baseUrl,
          description: data.description,
          isActive: data.isActive !== undefined ? data.isActive : true,
          requiresKey: data.requiresKey !== undefined ? data.requiresKey : false,
          supportsVoiceCommand:
            data.type === MODEL_TYPE.TTS ? data.supportsVoiceCommand === true : false,
          apiConfig: data.apiConfig || null,
          modelTag: data.modelTag || null,
          clientRoleBindAll: bindingInput.clientRoleBindAll,
        },
        include: {
          provider: true,
        },
      })

      await applyRoleBindingFields(
        tx,
        TARGET_TYPES.AI_MODEL,
        created.id,
        {
          clientRoleBindAll: bindingInput.clientRoleBindAll,
          clientRoleIds: bindingInput.clientRoleIds,
        },
        tx.aIModel,
      )

      return created
    })

    await syncVoiceProfilesSupportsVoiceCommandForModel(model)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_MODEL',
        targetType: 'model',
        targetId: model.id,
        details: data,
        ipAddress,
      })
    }

    return enrichItemWithRoleBindings(TARGET_TYPES.AI_MODEL, model)
  }

  /**
   * 更新模型
   */
  async updateModel(id, data, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(id)
    if (!model) {
      throw new NotFoundError('Model not found')
    }

    // 验证模型类型
    if (data.type && !Object.values(MODEL_TYPE).includes(data.type)) {
      throw new BadRequestError('Invalid model type')
    }

    // name 和 providerId 不可修改
    if (data.name && data.name !== model.name) {
      throw new BadRequestError('Model name cannot be changed')
    }
    if (data.providerId && data.providerId !== model.providerId) {
      throw new BadRequestError('Model provider cannot be changed')
    }

    const bindingInput = parseOptionalRoleBindingInput(data)
    const updated = await prisma.$transaction(async tx => {
      const row = await modelRepository.update(id, {
        ...data,
        ...(bindingInput ? { clientRoleBindAll: bindingInput.clientRoleBindAll } : {}),
      }, tx)

      if (bindingInput) {
        await applyRoleBindingFields(tx, TARGET_TYPES.AI_MODEL, id, data, tx.aIModel)
      }

      return row
    })

    if (data.type !== undefined || data.supportsVoiceCommand !== undefined) {
      await syncVoiceProfilesSupportsVoiceCommandForModel(updated)
    }

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_MODEL',
        targetType: 'model',
        targetId: id,
        details: data,
        ipAddress,
      })
    }

    return enrichItemWithRoleBindings(TARGET_TYPES.AI_MODEL, updated)
  }

  /**
   * 删除模型
   */
  async deleteModel(id, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(id)
    if (!model) {
      throw new NotFoundError('Model not found')
    }

    await modelRepository.delete(id)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_MODEL',
        targetType: 'model',
        targetId: id,
        details: { model: model.name },
        ipAddress,
      })
    }

    return { success: true }
  }

  /**
   * 批量更新模型状态
   */
  async batchUpdateStatus(ids, isActive, adminId = null, ipAddress = null) {
    const result = await modelRepository.batchUpdateStatus(ids, isActive)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_UPDATE_MODEL_STATUS',
        targetType: 'model',
        targetId: null,
        details: { ids, isActive },
        ipAddress,
      })
    }

    return result
  }

  /**
   * 批量删除模型
   */
  async batchDelete(ids, adminId = null, ipAddress = null) {
    const result = await modelRepository.batchDelete(ids)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'BATCH_DELETE_MODEL',
        targetType: 'model',
        targetId: null,
        details: { ids },
        ipAddress,
      })
    }

    return result
  }

  /**
   * 获取模型价格列表（分页）
   * @param {string|null} modelId - 模型ID，如果为null则查询全部模型的价格
   * @param {object} filters - 筛选条件
   * @param {object} pagination - 分页参数
   */
  async getModelPrices(modelId, filters = {}, pagination = {}) {
    // 如果传了模型ID，验证模型是否存在
    if (modelId) {
      const model = await modelRepository.findById(modelId)
      if (!model) {
        throw new NotFoundError('Model not found')
      }
    }

    return await modelRepository.findPrices(modelId, filters, pagination)
  }

  /**
   * 创建模型价格
   */
  async createModelPrice(data, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(data.modelId)
    if (!model) {
      throw new NotFoundError('Model not found')
    }

    const price = await modelRepository.createPrice(data)

    // 清除价格缓存
    const priceCalculatorService = require('./priceCalculator.service')
    priceCalculatorService.clearModelCache(data.modelId)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_MODEL_PRICE',
        targetType: 'model_price',
        targetId: price.id,
        details: data,
        ipAddress,
      })
    }

    return price
  }

  /**
   * 更新模型价格
   */
  async updateModelPrice(id, data, adminId = null, ipAddress = null) {
    const prisma = require('../config/database')
    const price = await prisma.modelPrice.findUnique({
      where: { id },
    })
    if (!price) {
      throw new NotFoundError('Model price not found')
    }

    const updated = await modelRepository.updatePrice(id, data)

    // 清除价格缓存
    const priceCalculatorService = require('./priceCalculator.service')
    priceCalculatorService.clearModelCache(price.modelId)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_MODEL_PRICE',
        targetType: 'model_price',
        targetId: id,
        details: data,
        ipAddress,
      })
    }

    return updated
  }

  /**
   * 删除模型价格
   */
  async deleteModelPrice(priceId, adminId = null, ipAddress = null) {
    const prisma = require('../config/database')
    const price = await prisma.modelPrice.findUnique({
      where: { id: priceId },
    })
    if (!price) {
      throw new NotFoundError('Model price not found')
    }

    await modelRepository.deletePrice(priceId)

    // 清除价格缓存
    const priceCalculatorService = require('./priceCalculator.service')
    priceCalculatorService.clearModelCache(price.modelId)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_MODEL_PRICE',
        targetType: 'model_price',
        targetId: priceId,
        details: { modelId: price.modelId },
        ipAddress,
      })
    }

    return { id: priceId }
  }

  /**
   * 更新模型状态
   */
  async updateModelStatus(id, isActive, adminId = null, ipAddress = null) {
    const model = await modelRepository.findById(id)
    if (!model) {
      throw new NotFoundError('Model not found')
    }

    const updated = await modelRepository.update(id, { isActive })

    // 清除价格缓存（模型状态变化可能影响价格可用性）
    const priceCalculatorService = require('./priceCalculator.service')
    priceCalculatorService.clearModelCache(id)

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service')
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_MODEL_STATUS',
        targetType: 'model',
        targetId: id,
        details: { isActive },
        ipAddress,
      })
    }

    return updated
  }
}

module.exports = new ModelService()
