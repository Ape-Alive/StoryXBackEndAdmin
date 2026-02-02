const prisma = require('../config/database');

/**
 * 提示词分类数据访问层
 */
class PromptCategoryRepository {
  /**
   * 获取分类列表
   */
  async findCategories(filters = {}) {
    const where = {};

    if (filters.name) {
      where.name = { contains: filters.name };
    }

    return await prisma.promptCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * 根据 ID 获取分类
   */
  async findById(id) {
    return await prisma.promptCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      }
    });
  }

  /**
   * 根据名称获取分类
   */
  async findByName(name) {
    return await prisma.promptCategory.findUnique({
      where: { name }
    });
  }

  /**
   * 创建分类
   */
  async create(data) {
    return await prisma.promptCategory.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description
      }
    });
  }

  /**
   * 更新分类
   */
  async update(id, data) {
    const updateData = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;

    updateData.updatedAt = new Date();

    return await prisma.promptCategory.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * 删除分类
   */
  async delete(id) {
    return await prisma.promptCategory.delete({
      where: { id }
    });
  }
}

module.exports = new PromptCategoryRepository();
