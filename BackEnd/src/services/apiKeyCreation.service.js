const axios = require('axios');
const { BadRequestError, InternalServerError } = require('../utils/errors');
const logger = require('../utils/logger');
const prisma = require('../config/database');

/**
 * API Key创建服务
 * 抽象不同提供商的API Key创建逻辑
 */
class ApiKeyCreationService {
  /**
   * 创建grsai API Key
   * @param {Object} config - 配置对象
   * @param {string} config.token - grsai主账户token
   * @param {string} config.name - API Key名称
   * @param {number} config.credits - 积分额度（0表示无限制）
   * @param {number} config.expireTime - 到期时间（时间戳，0表示永不过期）
   * @param {string} config.baseUrl - API基础URL（海外或国内）
   * @returns {Promise<Object>} - { id, key, name, credits, expireTime, createTime }
   */
  async createGrsaiApiKey(config) {
    const { token, name, credits = 0, expireTime = 0, baseUrl } = config;

    if (!token) {
      throw new BadRequestError('Grsai token is required');
    }

    // 默认使用海外节点，如果提供了baseUrl则使用提供的
    const apiBaseUrl = baseUrl || 'https://grsaiapi.com';
    const url = `${apiBaseUrl}/client/openapi/createAPIKey`;

    try {
      logger.info(`Calling grsai API: ${url}, name: ${name}, credits: ${credits}, expireTime: ${expireTime}`);

      const response = await axios.post(
        url,
        {
          token,
          type: credits > 0 ? 1 : 0, // 0=无限制，1=限制额度
          name: name || '',
          credits: credits || 0,
          expireTime: expireTime || 0
        },
        {
          timeout: 10000, // 10秒超时
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.debug(`Grsai API response: code=${response.data?.code}, msg=${response.data?.msg}`);

      if (response.data && response.data.code === 0 && response.data.data) {
        const result = {
          id: response.data.data.id,
          key: response.data.data.key,
          name: response.data.data.name,
          credits: response.data.data.credits || 0,
          expireTime: response.data.data.expireTime || 0,
          createTime: response.data.data.createTime || 0
        };
        logger.info(`Successfully created grsai API key: id=${result.id}, name=${result.name}`);
        return result;
      } else {
        const errorMsg = `Grsai API error: ${response.data?.msg || 'Unknown error'}, code=${response.data?.code}`;
        logger.error(errorMsg);
        throw new InternalServerError(errorMsg);
      }
    } catch (error) {
      logger.error('Failed to create grsai API key:', error);
      if (error.response) {
        const errorMsg = `Grsai API error: ${error.response.data?.msg || error.response.statusText}, status=${error.response.status}`;
        logger.error(errorMsg, error.response.data);
        throw new InternalServerError(errorMsg);
      }
      throw new InternalServerError(`Failed to create grsai API key: ${error.message}`);
    }
  }

  /**
   * 通用的API Key创建方法
   * @param {string} providerId - 提供商ID
   * @param {Object} config - 配置对象
   * @param {string} config.userId - 用户ID（可选）
   * @param {string} config.name - API Key名称
   * @param {number} config.credits - 积分额度（0表示无限制）
   * @param {number} config.expireTime - 到期时间（时间戳，0表示永不过期）
   * @param {string} config.baseUrl - API基础URL（可选，用于选择节点）
   * @returns {Promise<Object>} - API Key信息
   */
  async createApiKeyForProvider(providerId, config) {
    // 获取提供商信息
    const provider = await prisma.aIProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider) {
      throw new BadRequestError('Provider not found');
    }

    if (!provider.supportsApiKeyCreation) {
      // 不支持创建API Key，返回null
      return null;
    }

    if (!provider.mainAccountToken) {
      throw new BadRequestError('Provider main account token is not configured');
    }

    // 解析API Key创建配置
    let apiKeyConfig = {};
    if (provider.apiKeyCreationConfig) {
      try {
        apiKeyConfig = JSON.parse(provider.apiKeyCreationConfig);
      } catch (error) {
        logger.warn(`Failed to parse apiKeyCreationConfig for provider ${providerId}:`, error);
      }
    }

    // 根据提供商名称选择创建方法
    const providerName = provider.name.toLowerCase();

    // 如果提供了userId，将其添加到name中（用于第三方API调用）
    let apiKeyName = config.name || '';
    if (config.userId) {
      // 如果name已经包含userId，不再重复添加
      if (!apiKeyName.includes(config.userId)) {
        // 格式：原name_用户userId
        apiKeyName = apiKeyName
          ? `${apiKeyName}_用户${config.userId}`
          : `用户${config.userId}`;
      }
    }

    if (providerName === 'grsai') {
      return await this.createGrsaiApiKey({
        token: provider.mainAccountToken,
        name: apiKeyName,
        credits: config.credits || 0,
        expireTime: config.expireTime || 0,
        baseUrl: config.baseUrl || apiKeyConfig.baseUrl
      });
    }

    // 其他提供商可以在这里扩展
    throw new BadRequestError(`API key creation not implemented for provider: ${provider.name}`);
  }

  /**
   * 选择API Key（按优先级）
   * @param {string} userId - 用户ID
   * @param {string} providerId - 提供商ID
   * @returns {Promise<string|null>} - API Key（解密后的），如果不存在则返回null
   */
  async selectApiKeyForUser(userId, providerId) {
    const { decryptApiKey } = require('../utils/crypto');
    const userApiKeyRepository = require('../repositories/userApiKey.repository');

    // 1. 优先使用用户专属API Key（user_created类型优先）
    const userApiKeys = await userApiKeyRepository.findActiveByUserAndProvider(userId, providerId);

    if (userApiKeys && userApiKeys.length > 0) {
      // 优先使用user_created类型
      const userCreated = userApiKeys.find(k => k.type === 'user_created');
      if (userCreated) {
        return decryptApiKey(userCreated.apiKey);
      }
      // 其次使用system_created类型
      const systemCreated = userApiKeys.find(k => k.type === 'system_created');
      if (systemCreated) {
        return decryptApiKey(systemCreated.apiKey);
      }
    }

    // 2. 使用提供商关联的API Key
    const provider = await prisma.aIProvider.findUnique({
      where: { id: providerId }
    });

    logger.info(`[ApiKeyCreation] Selecting API Key for userId=${userId}, providerId=${providerId}`);
    logger.debug(`[ApiKeyCreation] Provider info: name=${provider?.name}, apiKeys=${provider?.apiKeys}, quota=${provider?.quota}`);

    // 优先从 provider.apiKeys 数组中查找（如果配置了）
    if (provider && provider.apiKeys) {
      try {
        const apiKeyIds = JSON.parse(provider.apiKeys);
        logger.info(`[ApiKeyCreation] Found ${apiKeyIds.length} API Key IDs in provider.apiKeys array`);
        if (Array.isArray(apiKeyIds) && apiKeyIds.length > 0) {
          // 遍历所有API Key，找到第一个可用的
          for (const apiKeyId of apiKeyIds) {
            logger.debug(`[ApiKeyCreation] Checking API Key ID: ${apiKeyId}`);
            const providerApiKey = await userApiKeyRepository.findById(apiKeyId);
            if (providerApiKey && providerApiKey.status === 'active') {
              // 检查是否过期
              const now = Math.floor(Date.now() / 1000);
              if (providerApiKey.expireTime === 0 || providerApiKey.expireTime > now) {
                // 检查API Key的积分额度（如果有限制）
                const apiKeyCredits = parseFloat(providerApiKey.credits) || 0;
                if (apiKeyCredits > 0) {
                  // API Key有积分限制，需要检查提供商是否有足够积分
                  const providerQuota = parseFloat(provider.quota) || 0;
                  if (providerQuota <= 0) {
                    // 提供商没有积分，跳过这个API Key
                    logger.warn(`[ApiKeyCreation] Provider ${providerId} has no quota (${providerQuota}), skipping API Key ${apiKeyId}`);
                    continue;
                  }
                }
                // API Key可用（无限制或提供商有积分）
                logger.info(`[ApiKeyCreation] Found available API Key from provider.apiKeys array: ${apiKeyId}`);
                return decryptApiKey(providerApiKey.apiKey);
              } else {
                logger.debug(`[ApiKeyCreation] API Key ${apiKeyId} is expired`);
              }
            } else {
              logger.debug(`[ApiKeyCreation] API Key ${apiKeyId} status is not active: ${providerApiKey?.status}`);
            }
          }
        }
      } catch (error) {
        logger.warn(`[ApiKeyCreation] Failed to parse provider apiKeys for provider ${providerId}:`, error);
      }
    }

    // 如果 provider.apiKeys 数组为空或没有找到可用的，直接查找所有系统级API Key（userId=null）
    logger.info(`[ApiKeyCreation] No API Key found from provider.apiKeys array, searching all system-level API Keys (userId=null)`);
    const systemApiKeys = await userApiKeyRepository.findByProvider(providerId, { userId: null, status: 'active' });
    logger.info(`[ApiKeyCreation] Found ${systemApiKeys.length} system-level API Keys for provider ${providerId}`);
    
    if (systemApiKeys && systemApiKeys.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      for (const apiKey of systemApiKeys) {
        logger.debug(`[ApiKeyCreation] Checking system API Key: id=${apiKey.id}, name=${apiKey.name}, expireTime=${apiKey.expireTime}`);
        // 检查是否过期
        const expireTime = typeof apiKey.expireTime === 'bigint' ? Number(apiKey.expireTime) : apiKey.expireTime;
        if (expireTime === 0 || expireTime > now) {
          // 检查API Key的积分额度（如果有限制）
          const apiKeyCredits = parseFloat(apiKey.credits) || 0;
          if (apiKeyCredits > 0) {
            // API Key有积分限制，需要检查提供商是否有足够积分
            const providerQuota = parseFloat(provider?.quota) || 0;
            if (providerQuota <= 0) {
              // 提供商没有积分，跳过这个API Key
              logger.warn(`[ApiKeyCreation] Provider ${providerId} has no quota (${providerQuota}), skipping API Key ${apiKey.id}`);
              continue;
            }
          }
          // API Key可用（无限制或提供商有积分）
          logger.info(`[ApiKeyCreation] Found available system-level API Key: ${apiKey.id}`);
          return decryptApiKey(apiKey.apiKey);
        } else {
          logger.debug(`[ApiKeyCreation] System API Key ${apiKey.id} is expired`);
        }
      }
    }

    // 注意：mainAccountToken 不能直接返回给客户端使用，它只用于调用第三方 API 创建 API Key
    // 如果以上都没有找到可用的 API Key，返回 null

    logger.warn(`[ApiKeyCreation] No API Key available for userId=${userId}, providerId=${providerId}`);
    return null;
  }
}

module.exports = new ApiKeyCreationService();
