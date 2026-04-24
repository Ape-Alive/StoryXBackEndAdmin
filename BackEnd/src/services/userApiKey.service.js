const userApiKeyRepository = require('../repositories/userApiKey.repository')
const apiKeyCreationService = require('./apiKeyCreation.service')
const { encryptApiKey, decryptApiKey } = require('../utils/crypto')
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')
const prisma = require('../config/database')

/**
 * 用户API Key业务逻辑层
 */
class UserApiKeyService {
  /**
   * 获取用户的API Key列表
   */
  async getUserApiKeys(userId, filters = {}) {
    return await userApiKeyRepository.findByUser(userId, filters)
  }

  /**
   * 获取API Key详情
   */
  async getApiKeyDetail(id, userId = null) {
    const apiKey = await userApiKeyRepository.findById(id)
    if (!apiKey) {
      throw new NotFoundError('API Key not found')
    }

    // 如果是用户查询，验证所有权
    if (userId && apiKey.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this API Key')
    }

    // 不返回加密的API Key，只返回基本信息
    const { apiKey: encryptedKey, ...rest } = apiKey
    return rest
  }

  /**
   * 用户创建API Key
   */
  async createUserApiKey(userId, data) {
    // 验证用户状态
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })
    if (!user) {
      throw new NotFoundError('User not found')
    }
    if (user.status !== 'normal') {
      throw new ForbiddenError('User account is not available')
    }

    // 获取用户当前有效的套餐
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        package: true,
      },
    })

    if (userPackages.length === 0) {
      throw new BadRequestError('User has no active packages')
    }

    // 提取套餐关联的模型
    const modelIds = new Set()
    for (const userPackage of userPackages) {
      const pkg = userPackage.package
      if (pkg.availableModels) {
        try {
          const models = JSON.parse(pkg.availableModels)
          if (Array.isArray(models)) {
            models.forEach((id) => modelIds.add(id))
          }
        } catch (error) {
          // 忽略解析错误
        }
      }
    }

    if (modelIds.size === 0) {
      throw new BadRequestError('No available models found in user packages')
    }

    // 获取模型所属的提供商
    const models = await prisma.aIModel.findMany({
      where: {
        id: { in: Array.from(modelIds) },
        isActive: true,
      },
      include: {
        provider: true,
      },
    })

    const providers = new Map()
    models.forEach((model) => {
      if (!providers.has(model.providerId)) {
        providers.set(model.providerId, model.provider)
      }
    })

    if (providers.size === 0) {
      throw new BadRequestError('No providers found for available models')
    }

    // 为每个支持创建API Key的提供商创建API Key
    const createdApiKeys = []
    const errors = []

    for (const [providerId, provider] of providers) {
      if (!provider.supportsApiKeyCreation) {
        errors.push(`Provider ${provider.displayName} does not support API key creation`)
        continue
      }

      try {
        // 计算过期时间
        let expireTime = 0
        if (data.expireTime) {
          expireTime =
            typeof data.expireTime === 'number'
              ? data.expireTime
              : Math.floor(new Date(data.expireTime).getTime() / 1000)
        }

        // 调用提供商API创建API Key
        const apiKeyInfo = await apiKeyCreationService.createApiKeyForProvider(providerId, {
          userId,
          name: data.name || `用户API Key_${provider.displayName}`,
          credits: 0, // 无限制
          expireTime,
        })

        if (!apiKeyInfo) {
          errors.push(`Failed to create API key for provider ${provider.displayName}`)
          continue
        }

        // 加密并保存API Key
        const encryptedKey = encryptApiKey(apiKeyInfo.key)

        const userApiKey = await userApiKeyRepository.create({
          userId,
          providerId,
          apiKey: encryptedKey,
          apiKeyId: apiKeyInfo.id,
          name: data.name || `用户API Key_${provider.displayName}`,
          type: 'user_created',
          credits: 0,
          expireTime: apiKeyInfo.expireTime || 0,
          status: 'active',
          createdBy: userId,
        })

        createdApiKeys.push(userApiKey)
      } catch (error) {
        errors.push(`Failed to create API key for provider ${provider.displayName}: ${error.message}`)
      }
    }

    if (createdApiKeys.length === 0 && errors.length > 0) {
      throw new BadRequestError(`Failed to create API keys: ${errors.join('; ')}`)
    }

    return {
      apiKeys: createdApiKeys,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * 删除用户API Key
   */
  async deleteUserApiKey(id, userId) {
    const apiKey = await userApiKeyRepository.findById(id)
    if (!apiKey) {
      throw new NotFoundError('API Key not found')
    }

    if (apiKey.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this API Key')
    }

    if (apiKey.type === 'system_created') {
      throw new BadRequestError('Cannot delete system-created API Key')
    }

    await userApiKeyRepository.updateStatus(id, 'revoked')
    return { success: true }
  }

  /**
   * 系统自动创建API Key（绑定套餐时）
   */
  async createSystemApiKeyForPackage(userId, packageId, providerId) {
    // 获取套餐信息
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    })

    if (!pkg) {
      throw new NotFoundError('Package not found')
    }

    // 获取提供商信息
    const provider = await prisma.aIProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      throw new NotFoundError('Provider not found')
    }

    if (!provider.supportsApiKeyCreation) {
      // 不支持创建API Key，返回null
      const logger = require('../utils/logger')
      logger.debug(`Provider ${providerId} (${provider.name}) does not support API key creation`)
      return null
    }

    // 检查主账户Token是否存在
    if (!provider.mainAccountToken) {
      const logger = require('../utils/logger')
      logger.warn(
        `Provider ${providerId} (${provider.name}) supports API key creation but mainAccountToken is not configured`
      )
      return null
    }

    // 检查是否已存在该用户、该提供商、该套餐的API Key
    const existing = await userApiKeyRepository.findActiveByUserAndProvider(userId, providerId)
    const existingForPackage = existing.find((k) => k.packageId === packageId)
    if (existingForPackage) {
      // 已存在，不重复创建
      return existingForPackage
    }

    // 计算过期时间（使用套餐的过期时间）
    let expireTime = 0
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        userId,
        packageId,
      },
    })

    if (userPackage && userPackage.expiresAt) {
      expireTime = Math.floor(userPackage.expiresAt.getTime() / 1000)
    }

    try {
      // 调用提供商API创建API Key
      const apiKeyInfo = await apiKeyCreationService.createApiKeyForProvider(providerId, {
        userId,
        name: `系统创建_${pkg.displayName}_${provider.displayName}`,
        credits: 0, // 无限制
        expireTime,
      })

      if (!apiKeyInfo) {
        const logger = require('../utils/logger')
        logger.warn(`Third-party API returned null for provider ${providerId}`)
        return null
      }

      // 加密并保存API Key
      const encryptedKey = encryptApiKey(apiKeyInfo.key)

      const userApiKey = await userApiKeyRepository.create({
        userId,
        providerId,
        apiKey: encryptedKey,
        apiKeyId: apiKeyInfo.id,
        name: `系统创建_${pkg.displayName}_${provider.displayName}`,
        type: 'system_created',
        credits: 0,
        expireTime: apiKeyInfo.expireTime || 0,
        status: 'active',
        packageId,
        createdBy: null, // 系统创建
      })

      return userApiKey
    } catch (error) {
      // 创建失败不影响套餐绑定，只记录日志
      const logger = require('../utils/logger')
      logger.error(
        `Failed to create system API key for user ${userId}, package ${packageId}, provider ${providerId}:`,
        error
      )
      return null
    }
  }

  /**
   * 获取提供商的API Key列表（管理员）
   */
  async getProviderApiKeys(providerId, filters = {}) {
    const voiceProfileRepository = require('../repositories/voiceProfile.repository')
    const items = await userApiKeyRepository.findByProvider(providerId, filters)
    return Promise.all(
      items.map(async (k) => {
        const credits = Number(k.credits) || 0
        const usedCredits = Number(k.usedCredits) || 0
        const remainingCredits = credits <= 0 ? null : Math.max(0, credits - usedCredits)
        let voiceCount = 0
        try {
          voiceCount = await voiceProfileRepository.countClonedVoicesByUserApiKeyId(k.id)
        } catch {
          voiceCount = 0
        }
        return {
          ...k,
          usedCredits,
          remainingCredits,
          voiceCount,
        }
      })
    )
  }

  /**
   * 通过「音色克隆」写入 meta.userApiKeyId 关联的音色列表（管理员）
   */
  async getClonedVoiceProfilesForProviderApiKey(providerId, apiKeyId, pagination = {}) {
    const voiceProfileRepository = require('../repositories/voiceProfile.repository')

    if (!apiKeyId || typeof apiKeyId !== 'string' || !/^[a-z0-9]+$/i.test(apiKeyId)) {
      throw new BadRequestError('Invalid API Key ID')
    }

    const apiKey = await userApiKeyRepository.findById(apiKeyId)
    if (!apiKey) throw new NotFoundError('API Key not found')
    if (apiKey.providerId !== providerId) {
      throw new BadRequestError('API Key does not belong to this provider')
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(pagination.pageSize, 10) || 20))

    const { data, total } = await voiceProfileRepository.findClonedVoicesByUserApiKeyId(apiKeyId, {
      page,
      pageSize,
    })

    const items = data.map((vp) => ({
      id: vp.id,
      voiceId: vp.voiceId,
      name: vp.name,
      description: vp.description,
      scope: vp.scope,
      isActive: vp.isActive,
      isModelLocked: vp.isModelLocked,
      createdAt: vp.createdAt,
      models: (vp.models || []).map((m) => ({
        modelId: m.modelId,
        modelName: m.model?.name,
        displayName: m.model?.displayName,
      })),
    }))

    return { data: items, total, page, pageSize }
  }

  /**
   * 解密提供商下系统级 API Key（仅管理员用于上传工具等场景；不落日志）
   */
  async getDecryptedTokenForProviderApiKey(providerId, apiKeyId) {
    const apiKey = await userApiKeyRepository.findById(apiKeyId)
    if (!apiKey) throw new NotFoundError('API Key not found')
    if (apiKey.providerId !== providerId) {
      throw new BadRequestError('API Key does not belong to this provider')
    }
    if (apiKey.userId != null) {
      throw new ForbiddenError('Cannot export user-owned API key')
    }
    if (apiKey.status !== 'active') {
      throw new BadRequestError('API Key is not active')
    }

    let plain
    try {
      plain = decryptApiKey(apiKey.apiKey)
    } catch {
      throw new BadRequestError('Failed to decrypt API key')
    }
    if (!plain) throw new BadRequestError('Invalid API key record')

    return { token: plain }
  }

  /**
   * 调整提供商API Key额度（管理员）
   * - credits 表示总额度；usedCredits 表示已消耗；remaining=credits-usedCredits
   */
  async adjustProviderApiKeyCredits(providerId, apiKeyId, credits, adminId) {
    const apiKey = await userApiKeyRepository.findById(apiKeyId)
    if (!apiKey) throw new NotFoundError('API Key not found')
    if (apiKey.providerId !== providerId) throw new BadRequestError('API Key does not belong to this provider')
    if (apiKey.userId !== null) throw new BadRequestError('Cannot adjust user-owned API Key')

    const newCredits = Number(credits)
    if (Number.isNaN(newCredits) || newCredits < 0) {
      throw new BadRequestError('Credits must be a non-negative number')
    }

    const usedCredits = Number(apiKey.usedCredits) || 0
    if (newCredits > 0 && newCredits < usedCredits) {
      throw new BadRequestError('Credits cannot be less than usedCredits')
    }

    const updated = await prisma.userApiKey.update({
      where: { id: apiKeyId },
      data: {
        credits: newCredits
      }
    })

    return updated
  }

  /**
   * 为提供商添加关联API Key（管理员）
   */
  async addProviderApiKey(providerId, data, adminId) {
    // 获取提供商信息
    const provider = await prisma.aIProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      throw new NotFoundError('Provider not found')
    }

    // 加密API Key
    const encryptedKey = encryptApiKey(data.apiKey)

    // 使用事务创建API Key并更新提供商 apiKeys 数组（提供商额度由后端汇总计算，不再持久化维护）
    const result = await prisma.$transaction(async (tx) => {
      // 创建API Key记录
      const userApiKey = await tx.userApiKey.create({
        data: {
          userId: null, // 系统级API Key
          providerId,
          apiKey: encryptedKey,
          apiKeyId: data.apiKeyId || null,
          name: data.name,
          type: 'provider_associated', // 管理员手动添加的API Key类型
          credits: data.credits || 0,
          usedCredits: 0,
          expireTime: data.expireTime || 0,
          status: 'active',
          voiceLimit: data.voiceLimit || 0,
          createdBy: adminId,
        },
      })

      // 更新提供商apiKeys数组
      let apiKeyIds = []
      if (provider.apiKeys) {
        try {
          apiKeyIds = JSON.parse(provider.apiKeys)
        } catch (error) {
          // 忽略解析错误
        }
      }
      apiKeyIds.push(userApiKey.id)

      await tx.aIProvider.update({
        where: { id: providerId },
        data: {
          apiKeys: JSON.stringify(apiKeyIds),
        },
      })

      return userApiKey
    })

    return result
  }

  /**
   * 删除提供商的关联API Key（管理员）
   */
  async deleteProviderApiKey(providerId, apiKeyId, adminId) {
    // 获取API Key信息
    const apiKey = await userApiKeyRepository.findById(apiKeyId)
    if (!apiKey) {
      throw new NotFoundError('API Key not found')
    }

    if (apiKey.providerId !== providerId) {
      throw new BadRequestError('API Key does not belong to this provider')
    }

    if (apiKey.userId !== null) {
      throw new BadRequestError('Cannot delete user-owned API Key')
    }

    // 获取提供商信息
    const provider = await prisma.aIProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      throw new NotFoundError('Provider not found')
    }

    // 使用事务删除API Key并更新提供商 apiKeys 数组（提供商额度由后端汇总计算，不再持久化维护）
    await prisma.$transaction(async (tx) => {
      // 删除API Key
      await tx.userApiKey.delete({
        where: { id: apiKeyId },
      })

      // 更新提供商apiKeys数组
      let apiKeyIds = []
      if (provider.apiKeys) {
        try {
          apiKeyIds = JSON.parse(provider.apiKeys)
        } catch (error) {
          // 忽略解析错误
        }
      }
      apiKeyIds = apiKeyIds.filter((id) => id !== apiKeyId)

      await tx.aIProvider.update({
        where: { id: providerId },
        data: {
          apiKeys: JSON.stringify(apiKeyIds),
        },
      })
    })

    return { success: true }
  }
}

module.exports = new UserApiKeyService()
