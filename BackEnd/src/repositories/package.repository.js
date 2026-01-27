const prisma = require('../config/database');

/**
 * 套餐数据访问层
 */
class PackageRepository {
  /**
   * 获取套餐列表（分页）
   */
  async findPackages(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.name || filters.displayName) {
      where.OR = [
        { name: { contains: filters.name } },
        { displayName: { contains: filters.displayName } }
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.isStackable !== undefined) {
      where.isStackable = filters.isStackable === 'true' || filters.isStackable === true;
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
    } else if (sort.priority) {
      orderBy.priority = sort.priority;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: {
              userPackages: true,
              quotaRecords: true
            }
          }
        }
      }),
      prisma.package.count({ where })
    ]);

    const formattedData = data.map(item => ({
      ...item,
      userCount: item._count.userPackages,
      quotaRecordCount: item._count.quotaRecords
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取套餐
   */
  async findById(id) {
    return await prisma.package.findUnique({
      where: { id }
    });
  }

  /**
   * 根据名称获取套餐
   */
  async findByName(name) {
    return await prisma.package.findUnique({
      where: { name }
    });
  }

  /**
   * 创建套餐
   */
  async create(data) {
    return await prisma.package.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        type: data.type,
        duration: data.duration,
        quota: data.quota,
        price: data.price,
        priceUnit: data.priceUnit,
        discount: data.discount,
        maxDevices: data.maxDevices,
        // availableModels: null 或空数组表示所有模型都可用
        availableModels: data.availableModels && Array.isArray(data.availableModels) && data.availableModels.length > 0
          ? JSON.stringify(data.availableModels)
          : null,
        isStackable: data.isStackable !== undefined ? data.isStackable : false,
        priority: data.priority || 0,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  /**
   * 更新套餐
   */
  async update(id, data) {
    const updateData = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.quota !== undefined) updateData.quota = data.quota;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.priceUnit !== undefined) updateData.priceUnit = data.priceUnit;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.maxDevices !== undefined) updateData.maxDevices = data.maxDevices;
    if (data.availableModels !== undefined) {
      // availableModels: null 或空数组表示所有模型都可用
      updateData.availableModels = data.availableModels && Array.isArray(data.availableModels) && data.availableModels.length > 0
        ? JSON.stringify(data.availableModels)
        : null;
    }
    if (data.isStackable !== undefined) updateData.isStackable = data.isStackable;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    updateData.updatedAt = new Date();

    return await prisma.package.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * 删除套餐
   */
  async delete(id) {
    return await prisma.package.delete({
      where: { id }
    });
  }

  /**
   * 检查是否有用户使用该套餐
   */
  async hasUsers(id) {
    const count = await prisma.userPackage.count({
      where: { packageId: id }
    });
    return count > 0;
  }

  /**
   * 复制套餐（创建新套餐）
   */
  async duplicate(id, newName, newDisplayName) {
    const original = await prisma.package.findUnique({
      where: { id }
    });

    if (!original) {
      throw new Error('Package not found');
    }

    return await prisma.package.create({
      data: {
        name: newName,
        displayName: newDisplayName,
        description: original.description,
        type: original.type,
        duration: original.duration,
        quota: original.quota,
        price: original.price,
        priceUnit: original.priceUnit,
        discount: original.discount,
        maxDevices: original.maxDevices,
        availableModels: original.availableModels,
        isStackable: original.isStackable,
        priority: original.priority,
        isActive: false // 复制的套餐默认不启用
      }
    });
  }

  /**
   * 批量更新套餐
   */
  async batchUpdate(ids, data) {
    const result = await prisma.package.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    return {
      count: result.count,
      ids: ids
    };
  }

  /**
   * 批量删除套餐
   */
  async batchDelete(ids) {
    const result = await prisma.package.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return {
      count: result.count,
      ids: ids
    };
  }

  /**
   * 查找正在使用的套餐ID列表
   */
  async findPackagesInUse(ids) {
    const userPackages = await prisma.userPackage.findMany({
      where: {
        packageId: { in: ids }
      },
      select: {
        packageId: true
      },
      distinct: ['packageId']
    });

    return userPackages.map(up => up.packageId);
  }
}

module.exports = new PackageRepository();
