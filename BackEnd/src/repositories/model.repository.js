const prisma = require('../config/database');

/**
 * 模型数据访问层
 */
class ModelRepository {
  /**
   * 获取模型列表（分页）
   */
  async findModels(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.name || filters.displayName) {
      where.OR = [
        { name: { contains: filters.name } },
        { displayName: { contains: filters.displayName } }
      ];
    }

    if (filters.baseUrl) {
      where.baseUrl = { contains: filters.baseUrl };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.providerId) {
      where.providerId = filters.providerId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.requiresKey !== undefined) {
      where.requiresKey = filters.requiresKey === 'true' || filters.requiresKey === true;
    }

    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) {
        where.createdAt.gte = new Date(filters.createdAt.gte);
      }
      if (filters.createdAt.lte) {
        where.createdAt.lte = new Date(filters.createdAt.lte);
      }
    }

    const orderBy = {};
    if (sort.createdAt) {
      orderBy.createdAt = sort.createdAt;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.aIModel.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          provider: true,
          _count: {
            select: {
              prices: true,
              authorizations: true,
              aiCallLogs: true
            }
          }
        }
      }),
      prisma.aIModel.count({ where })
    ]);

    // 计算全路径（基路径 + 接口路径）
    const formattedData = data.map(item => ({
      ...item,
      fullUrl: item.provider.baseUrl
        ? `${item.provider.baseUrl}${item.baseUrl}`
        : item.baseUrl,
      priceCount: item._count.prices,
      authorizationCount: item._count.authorizations,
      callLogCount: item._count.aiCallLogs
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取模型
   */
  async findById(id) {
    return await prisma.aIModel.findUnique({
      where: { id },
      include: {
        provider: true,
        prices: {
          orderBy: {
            effectiveAt: 'desc'
          },
          take: 10
        }
      }
    });
  }

  /**
   * 根据提供商和名称获取模型
   */
  async findByProviderAndName(providerId, name) {
    return await prisma.aIModel.findFirst({
      where: {
        providerId,
        name
      }
    });
  }

  /**
   * 创建模型
   */
  async create(data) {
    return await prisma.aIModel.create({
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
        apiConfig: data.apiConfig || null
      },
      include: {
        provider: true
      }
    });
  }

  /**
   * 更新模型
   */
  async update(id, data) {
    const updateData = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.requiresKey !== undefined) updateData.requiresKey = data.requiresKey;
    if (data.apiConfig !== undefined) updateData.apiConfig = data.apiConfig || null;

    updateData.updatedAt = new Date();

    return await prisma.aIModel.update({
      where: { id },
      data: updateData,
      include: {
        provider: true
      }
    });
  }

  /**
   * 删除模型
   */
  async delete(id) {
    return await prisma.aIModel.delete({
      where: { id }
    });
  }

  /**
   * 批量更新模型状态
   */
  async batchUpdateStatus(ids, isActive) {
    return await prisma.aIModel.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        isActive,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 批量删除模型
   */
  async batchDelete(ids) {
    return await prisma.aIModel.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }

  /**
   * 获取模型价格列表（分页）
   * @param {string|null} modelId - 模型ID，如果为null则查询全部模型的价格
   * @param {object} filters - 筛选条件
   * @param {object} pagination - 分页参数
   */
  async findPrices(modelId, filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    // 如果传了模型ID，则添加筛选条件
    if (modelId) {
      where.modelId = modelId;
    }

    if (filters.packageId !== undefined && filters.packageId !== null) {
      where.packageId = filters.packageId;
    }

    if (filters.pricingType) {
      where.pricingType = filters.pricingType;
    }

    if (filters.effectiveAt) {
      where.effectiveAt = {};
      if (filters.effectiveAt.gte) {
        where.effectiveAt.gte = new Date(filters.effectiveAt.gte);
      }
      if (filters.effectiveAt.lte) {
        where.effectiveAt.lte = new Date(filters.effectiveAt.lte);
      }
    }

    if (filters.expiredAt) {
      where.expiredAt = {};
      if (filters.expiredAt.gte) {
        where.expiredAt.gte = new Date(filters.expiredAt.gte);
      }
      if (filters.expiredAt.lte) {
        where.expiredAt.lte = new Date(filters.expiredAt.lte);
      }
    }

    const orderBy = {
      effectiveAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.modelPrice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          model: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          }
        }
      }),
      prisma.modelPrice.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 创建模型价格
   */
  async createPrice(data) {
    return await prisma.modelPrice.create({
      data: {
        modelId: data.modelId,
        packageId: data.packageId || null,
        pricingType: data.pricingType || 'token',
        inputPrice: data.inputPrice || 0,
        outputPrice: data.outputPrice || 0,
        callPrice: data.callPrice || 0,
        maxToken: data.maxToken !== undefined ? (data.maxToken === null || data.maxToken === '' ? null : parseInt(data.maxToken)) : null,
        effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : new Date(),
        expiredAt: data.expiredAt ? new Date(data.expiredAt) : null
      }
    });
  }

  /**
   * 更新模型价格
   */
  async updatePrice(id, data) {
    const updateData = {};

    if (data.pricingType !== undefined) updateData.pricingType = data.pricingType;
    if (data.inputPrice !== undefined) updateData.inputPrice = data.inputPrice;
    if (data.outputPrice !== undefined) updateData.outputPrice = data.outputPrice;
    if (data.callPrice !== undefined) updateData.callPrice = data.callPrice;
    if (data.maxToken !== undefined) {
      updateData.maxToken = data.maxToken === null || data.maxToken === '' ? null : parseInt(data.maxToken);
    }
    if (data.effectiveAt !== undefined) updateData.effectiveAt = new Date(data.effectiveAt);
    if (data.expiredAt !== undefined) updateData.expiredAt = data.expiredAt ? new Date(data.expiredAt) : null;

    updateData.updatedAt = new Date();

    return await prisma.modelPrice.update({
      where: { id },
      data: updateData
    });
  }
}

module.exports = new ModelRepository();
