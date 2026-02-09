const prisma = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const cacheService = require('./cache.service');

/**
 * 价格计算服务
 */
class PriceCalculatorService {
  /**
   * 根据用户套餐获取模型价格
   * 优先匹配用户套餐价格，如果没有则使用默认价格
   * 使用缓存提高性能
   */
  async getModelPriceForUser(modelId, userId) {
    // 尝试从缓存获取
    const cacheKey = `price:${modelId}:${userId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
    // 获取用户的所有有效套餐（按优先级排序）
    // 包括永久套餐（expiresAt为null）和未过期的套餐
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        startedAt: { lte: new Date() }, // 套餐已开始
        OR: [
          { expiresAt: null }, // 永久套餐
          { expiresAt: { gt: new Date() } } // 未过期的套餐
        ]
      },
      include: {
        package: {
          where: {
            isActive: true // 只查询激活的套餐
          }
        }
      },
      orderBy: {
        priority: 'desc' // 优先级高的在前
      }
    });

    // 过滤掉package为null的记录（套餐被禁用的情况）
    const validUserPackages = userPackages.filter(up => up.package !== null);

    // 查找模型价格（优先匹配套餐价格）
    for (const userPackage of validUserPackages) {
      const packagePrice = await prisma.modelPrice.findFirst({
        where: {
          modelId,
          packageId: userPackage.packageId,
          effectiveAt: { lte: new Date() },
          OR: [
            { expiredAt: null },
            { expiredAt: { gt: new Date() } }
          ]
        },
        orderBy: {
          effectiveAt: 'desc'
        }
      });

      if (packagePrice) {
        return packagePrice;
      }
    }

    // 如果没有找到套餐价格，使用默认价格（packageId为null）
    const defaultPrice = await prisma.modelPrice.findFirst({
      where: {
        modelId,
        packageId: null,
        effectiveAt: { lte: new Date() },
        OR: [
          { expiredAt: null },
          { expiredAt: { gt: new Date() } }
        ]
      },
      orderBy: {
        effectiveAt: 'desc'
      }
    });

    if (!defaultPrice) {
      throw new NotFoundError('Model price configuration not available');
    }

    // 缓存价格（缓存10分钟）
    cacheService.set(cacheKey, defaultPrice, 10 * 60 * 1000);

    return defaultPrice;
  }

  /**
   * 清除用户的价格缓存
   * @param {string} userId - 用户ID
   * @param {string} modelId - 模型ID（可选）
   */
  clearCache(userId, modelId = null) {
    if (modelId) {
      cacheService.delete(`price:${modelId}:${userId}`);
    } else {
      // 清除该用户的所有价格缓存
      cacheService.deletePattern(`price:*:${userId}`);
    }
  }

  /**
   * 清除模型的价格缓存
   * @param {string} modelId - 模型ID
   */
  clearModelCache(modelId) {
    cacheService.deletePattern(`price:${modelId}:*`);
  }

  /**
   * 计算预估费用（根据预估token数）
   * 根据模型的pricingType和maxToken计算费用
   * 
   * 计费策略：
   * 1. 如果pricingType为'call'：直接返回callPrice
   * 2. 如果pricingType为'token'：
   *    - 如果price.maxToken存在且>0：使用maxToken作为预估token数（即使estimatedTokens更大）
   *    - 如果price.maxToken为null且estimatedTokens>0：使用estimatedTokens
   *    - 如果都没有：返回最小费用（按1个input token计算）
   */
  async calculateEstimatedCost(modelId, userId, estimatedTokens = 0) {
    const price = await this.getModelPriceForUser(modelId, userId);

    if (price.pricingType === 'token') {
      // 按token计价
      let estimatedInputTokens = 0;
      let estimatedOutputTokens = 0;
      let usedMaxToken = false;
      
      // 优先使用maxToken（如果存在）
      if (price.maxToken !== null && price.maxToken > 0) {
        // 使用maxToken作为预估的最大token数
        // 假设输入输出各占一半
        estimatedInputTokens = Math.floor(price.maxToken * 0.5);
        estimatedOutputTokens = Math.floor(price.maxToken * 0.5);
        usedMaxToken = true;
      } else if (estimatedTokens > 0) {
        // 如果没有maxToken限制，使用用户提供的estimatedTokens
        estimatedInputTokens = Math.floor(estimatedTokens * 0.5);
        estimatedOutputTokens = Math.floor(estimatedTokens * 0.5);
      } else {
        // 如果既没有maxToken也没有estimatedTokens，返回最小费用（按1个input token计算）
        estimatedInputTokens = 1;
        estimatedOutputTokens = 0;
      }
      
      const cost = 
        parseFloat(price.inputPrice) * estimatedInputTokens +
        parseFloat(price.outputPrice) * estimatedOutputTokens;
      
      return {
        cost: Math.max(cost, 0),
        price,
        estimatedInputTokens,
        estimatedOutputTokens,
        maxToken: price.maxToken,
        usedMaxToken // 标识是否使用了maxToken
      };
    } else if (price.pricingType === 'call') {
      // 按调用次数计价
      return {
        cost: parseFloat(price.callPrice),
        price,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        maxToken: null,
        usedMaxToken: false
      };
    } else {
      throw new BadRequestError('Invalid pricing type');
    }
  }

  /**
   * 计算实际费用（根据实际token消耗）
   */
  async calculateActualCost(modelId, userId, inputTokens, outputTokens) {
    const price = await this.getModelPriceForUser(modelId, userId);

    if (price.pricingType === 'token') {
      // 按token计价
      const cost = 
        parseFloat(price.inputPrice) * inputTokens +
        parseFloat(price.outputPrice) * outputTokens;
      
      return {
        cost: Math.max(cost, 0),
        price,
        inputTokens,
        outputTokens
      };
    } else if (price.pricingType === 'call') {
      // 按调用次数计价
      return {
        cost: parseFloat(price.callPrice),
        price,
        inputTokens,
        outputTokens
      };
    } else {
      throw new BadRequestError('Invalid pricing type');
    }
  }
}

module.exports = new PriceCalculatorService();
