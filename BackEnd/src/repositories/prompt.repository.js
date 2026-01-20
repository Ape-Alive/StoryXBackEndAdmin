const prisma = require('../config/database');

/**
 * 提示词数据访问层
 */
class PromptRepository {
  /**
   * 获取提示词列表
   */
  async findPrompts(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.title) {
      where.title = { contains: filters.title };
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.tags) {
      // 简单的标签搜索（JSON 字符串包含）
      where.tags = { contains: filters.tags };
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
    } else if (sort.title) {
      orderBy.title = sort.title;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          category: true,
          _count: {
            select: {
              versions: true
            }
          }
        }
      }),
      prisma.prompt.count({ where })
    ]);

    const formattedData = data.map(item => ({
      ...item,
      versionCount: item._count.versions
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取提示词
   */
  async findById(id) {
    return await prisma.prompt.findUnique({
      where: { id },
      include: {
        category: true,
        versions: {
          orderBy: {
            version: 'desc'
          },
          take: 10
        }
      }
    });
  }

  /**
   * 创建提示词
   */
  async create(data) {
    return await prisma.prompt.create({
      data: {
        title: data.title,
        content: data.content,
        description: data.description,
        categoryId: data.categoryId,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        type: data.type,
        userId: data.userId || null,
        version: 1,
        isActive: data.isActive !== undefined ? data.isActive : true
      },
      include: {
        category: true
      }
    });
  }

  /**
   * 更新提示词（同时创建新版本）
   */
  async update(id, data, updatedBy = null) {
    // 获取当前提示词
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // 保存当前版本到版本表
    const currentVersion = prompt.versions[0] || prompt;
    await prisma.promptVersion.create({
      data: {
        promptId: id,
        version: prompt.version,
        content: prompt.content,
        updatedBy: updatedBy || null
      }
    });

    // 更新提示词
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    updateData.version = prompt.version + 1;
    updateData.updatedAt = new Date();

    return await prisma.prompt.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });
  }

  /**
   * 删除提示词
   */
  async delete(id) {
    return await prisma.prompt.delete({
      where: { id }
    });
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(id, version, updatedBy = null) {
    const prompt = await prisma.prompt.findUnique({
      where: { id }
    });

    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // 查找指定版本
    const targetVersion = await prisma.promptVersion.findUnique({
      where: {
        promptId_version: {
          promptId: id,
          version: version
        }
      }
    });

    if (!targetVersion) {
      throw new Error('Version not found');
    }

    // 保存当前版本
    await prisma.promptVersion.create({
      data: {
        promptId: id,
        version: prompt.version,
        content: prompt.content,
        updatedBy: updatedBy || null
      }
    });

    // 回滚到指定版本
    return await prisma.prompt.update({
      where: { id },
      data: {
        content: targetVersion.content,
        version: prompt.version + 1,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 获取提示词的所有版本
   */
  async findVersions(promptId) {
    return await prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: {
        version: 'desc'
      }
    });
  }
}

module.exports = new PromptRepository();
