const prisma = require('../config/database');

/**
 * 提供商数据访问层
 */
class ProviderRepository {
  /**
   * 获取提供商列表（分页）
   */
  async findProviders(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.name || filters.displayName) {
      where.OR = [
        { name: { contains: filters.name } },
        { displayName: { contains: filters.displayName } }
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
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
      prisma.aIProvider.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: {
              models: true
            }
          }
        }
      }),
      prisma.aIProvider.count({ where })
    ]);

    const formattedData = data.map(item => ({
      ...item,
      modelCount: item._count.models
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取提供商
   */
  async findById(id) {
    return await prisma.aIProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            models: true
          }
        }
      }
    });
  }

  /**
   * 根据名称获取提供商
   */
  async findByName(name) {
    return await prisma.aIProvider.findUnique({
      where: { name }
    });
  }

  /**
   * 创建提供商
   */
  async create(data) {
    return await prisma.aIProvider.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        baseUrl: data.baseUrl,
        website: data.website,
        logoUrl: data.logoUrl,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  /**
   * 更新提供商
   */
  async update(id, data) {
    const updateData = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    updateData.updatedAt = new Date();

    return await prisma.aIProvider.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * 删除提供商
   */
  async delete(id) {
    return await prisma.aIProvider.delete({
      where: { id }
    });
  }

  /**
   * 检查是否有关联模型
   */
  async hasModels(id) {
    const count = await prisma.aIModel.count({
      where: { providerId: id }
    });
    return count > 0;
  }

  /**
   * 更新提供商状态（同时更新关联模型状态）
   */
  async updateStatus(id, isActive) {
    // 更新提供商状态
    const provider = await prisma.aIProvider.update({
      where: { id },
      data: { isActive, updatedAt: new Date() }
    });

    // 如果禁用提供商，禁用所有关联模型
    if (!isActive) {
      await prisma.aIModel.updateMany({
        where: { providerId: id },
        data: { isActive: false }
      });
    }

    return provider;
  }
}

module.exports = new ProviderRepository();
