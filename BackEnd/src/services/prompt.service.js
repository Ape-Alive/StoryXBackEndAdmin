const promptRepository = require('../repositories/prompt.repository');
const promptCategoryRepository = require('../repositories/promptCategory.repository');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants/roles');

/**
 * 提示词业务逻辑层
 */
class PromptService {
  /**
   * 获取提示词列表
   */
  async getPrompts(filters = {}, pagination = {}, sort = {}) {
    return await promptRepository.findPrompts(filters, pagination, sort);
  }

  /**
   * 获取提示词详情
   */
  async getPromptDetail(id) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    // 解析 tags JSON
    if (prompt.tags) {
      try {
        prompt.tags = JSON.parse(prompt.tags);
      } catch (e) {
        prompt.tags = [];
      }
    }

    return prompt;
  }

  /**
   * 创建提示词
   */
  async createPrompt(data, userId = null, adminId = null, ipAddress = null) {
    // 验证分类是否存在
    const category = await promptCategoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // 验证类型权限
    if (data.type === 'system' && !adminId) {
      throw new ForbiddenError('Only admin can create system prompts');
    }

    // 用户提示词必须设置 userId
    if (data.type === 'user' && !userId) {
      throw new BadRequestError('User ID is required for user prompts');
    }

    const prompt = await promptRepository.create({
      ...data,
      userId: data.type === 'user' ? userId : null
    });

    // 创建初始版本
    const prisma = require('../config/database');
    await prisma.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: 1,
        content: prompt.content,
        updatedBy: adminId || userId || null
      }
    });

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_PROMPT',
        targetType: 'prompt',
        targetId: prompt.id,
        details: data,
        ipAddress
      });
    }

    return prompt;
  }

  /**
   * 更新提示词
   */
  async updatePrompt(id, data, userId = null, adminId = null, ipAddress = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    // 权限检查
    if (prompt.type === 'system' && !adminId) {
      throw new ForbiddenError('Only admin can update system prompts');
    }

    if (prompt.type === 'user' && prompt.userId !== userId && !adminId) {
      throw new ForbiddenError('Permission denied');
    }

    const updated = await promptRepository.update(id, data, adminId || userId);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_PROMPT',
        targetType: 'prompt',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 删除提示词
   */
  async deletePrompt(id, userId = null, adminId = null, ipAddress = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    // 权限检查
    if (prompt.type === 'system' && !adminId) {
      throw new ForbiddenError('Only admin can delete system prompts');
    }

    if (prompt.type === 'user' && prompt.userId !== userId && !adminId) {
      throw new ForbiddenError('Permission denied');
    }

    await promptRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_PROMPT',
        targetType: 'prompt',
        targetId: id,
        details: { title: prompt.title },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 获取提示词版本列表
   */
  async getPromptVersions(promptId) {
    const prompt = await promptRepository.findById(promptId);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    return await promptRepository.findVersions(promptId);
  }

  /**
   * 回滚到指定版本
   */
  async rollbackPrompt(id, version, adminId = null, ipAddress = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    // 只有管理员可以回滚系统提示词
    if (prompt.type === 'system' && !adminId) {
      throw new ForbiddenError('Only admin can rollback system prompts');
    }

    const rolledBack = await promptRepository.rollbackToVersion(id, version, adminId);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'ROLLBACK_PROMPT',
        targetType: 'prompt',
        targetId: id,
        details: { version },
        ipAddress
      });
    }

    return rolledBack;
  }

  /**
   * 获取提示词分类列表
   */
  async getCategories(filters = {}) {
    return await promptCategoryRepository.findCategories(filters);
  }

  /**
   * 创建提示词分类
   */
  async createCategory(data, adminId = null, ipAddress = null) {
    // 检查名称是否已存在
    const existing = await promptCategoryRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Category name already exists');
    }

    const category = await promptCategoryRepository.create(data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_PROMPT_CATEGORY',
        targetType: 'prompt_category',
        targetId: category.id,
        details: data,
        ipAddress
      });
    }

    return category;
  }

  /**
   * 更新提示词分类
   */
  async updateCategory(id, data, adminId = null, ipAddress = null) {
    const category = await promptCategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const updated = await promptCategoryRepository.update(id, data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_PROMPT_CATEGORY',
        targetType: 'prompt_category',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 删除提示词分类
   */
  async deleteCategory(id, adminId = null, ipAddress = null) {
    const category = await promptCategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // 检查是否有关联的提示词
    const prisma = require('../config/database');
    const promptCount = await prisma.prompt.count({
      where: { categoryId: id }
    });

    if (promptCount > 0) {
      throw new ConflictError('Category has associated prompts, cannot be deleted');
    }

    await promptCategoryRepository.delete(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_PROMPT_CATEGORY',
        targetType: 'prompt_category',
        targetId: id,
        details: { name: category.name },
        ipAddress
      });
    }

    return { success: true };
  }
}

module.exports = new PromptService();
