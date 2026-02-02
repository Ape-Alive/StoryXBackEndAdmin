const promptRepository = require('../repositories/prompt.repository');
const promptCategoryRepository = require('../repositories/promptCategory.repository');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants/roles');

/**
 * 判断是否是管理员角色
 */
function isAdminRole(role) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.PLATFORM_ADMIN,
    ROLES.OPERATOR,
    ROLES.RISK_CONTROL,
    ROLES.FINANCE,
    ROLES.READ_ONLY
  ].includes(role);
}

/**
 * 判断是否是终端用户角色
 */
function isTerminalUserRole(role) {
  return [ROLES.USER, ROLES.BASIC_USER].includes(role);
}

/**
 * 判断提示词类型是否包含"系统"
 */
function isSystemType(type) {
  return type === 'system' || type === 'system_user';
}

/**
 * 提示词业务逻辑层
 */
class PromptService {
  /**
   * 获取提示词列表
   * @param {Object} filters - 筛选条件
   * @param {Object} pagination - 分页信息
   * @param {Object} sort - 排序信息
   * @param {String} userRole - 用户角色
   * @param {String} userId - 用户ID（终端用户需要）
   */
  async getPrompts(filters = {}, pagination = {}, sort = {}, userRole = null, userId = null) {
    // 如果是终端用户，只能看到：
    // 1. system 类型的提示词（可查看）
    // 2. system_user 类型的提示词（可查看）
    // 3. 自己的终端用户提示词（type='user' 且 userId=自己的ID）
    if (userRole && isTerminalUserRole(userRole)) {
      const typeFilter = {
        OR: [
          { type: 'system' },
          { type: 'system_user' },
          { type: 'user', userId: userId }
        ]
      };
      filters = { ...filters, ...typeFilter };
    }
    // 管理员可以看到所有类型的提示词

    return await promptRepository.findPrompts(filters, pagination, sort);
  }

  /**
   * 获取提示词详情
   * @param {String} id - 提示词ID
   * @param {String} userRole - 用户角色
   * @param {String} userId - 用户ID（终端用户需要）
   */
  async getPromptDetail(id, userRole = null, userId = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    // 权限检查：终端用户只能查看system、system_user类型和自己的user类型
    if (userRole && isTerminalUserRole(userRole)) {
      const canView =
        prompt.type === 'system' ||
        prompt.type === 'system_user' ||
        (prompt.type === 'user' && prompt.userId === userId);

      if (!canView) {
        throw new ForbiddenError('Permission denied');
      }
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
   * @param {Object} data - 提示词数据
   * @param {String} userId - 用户ID
   * @param {String} adminId - 管理员ID
   * @param {String} ipAddress - IP地址
   * @param {String} userRole - 用户角色
   */
  async createPrompt(data, userId = null, adminId = null, ipAddress = null, userRole = null) {
    // 验证 functionKey 是否已存在
    if (!data.functionKey) {
      throw new BadRequestError('Function key is required');
    }
    const existingByFunctionKey = await promptRepository.findByFunctionKey(data.functionKey);
    if (existingByFunctionKey) {
      throw new ConflictError('Function key already exists');
    }

    // 验证分类是否存在
    const category = await promptCategoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const isAdmin = adminId && isAdminRole(userRole);

    // 权限检查：带有"系统"的类型只能管理员创建
    if (isSystemType(data.type) && !isAdmin) {
      throw new ForbiddenError('Only admin can create system-related prompts');
    }

    // 终端用户提示词（user）必须设置 userId，且只能终端用户创建
    if (data.type === 'user') {
      if (!userId) {
        throw new BadRequestError('User ID is required for user prompts');
      }
      if (isAdmin) {
        throw new BadRequestError('Admin cannot create user prompts, use system_user instead');
      }
    }

    // 系统用户提示词（system_user）只能管理员创建，不需要userId
    if (data.type === 'system_user' && !isAdmin) {
      throw new ForbiddenError('Only admin can create system_user prompts');
    }

    // 验证 systemId：如果提供了 systemId，必须是 system 类型的提示词
    if (data.systemId) {
      const systemPrompt = await promptRepository.findById(data.systemId);
      if (!systemPrompt) {
        throw new NotFoundError('System prompt not found');
      }
      if (systemPrompt.type !== 'system') {
        throw new BadRequestError('systemId must point to a system type prompt');
      }
      // system_user 和 user 类型可以关联 system
      if (data.type !== 'system_user' && data.type !== 'user') {
        throw new BadRequestError('Only system_user and user types can have systemId');
      }
    }

    // 设置 userId：只有 user 类型需要设置 userId
    const promptData = {
      ...data,
      userId: data.type === 'user' ? userId : null,
      systemId: (data.type === 'system_user' || data.type === 'user') ? data.systemId : null
    };

    const prompt = await promptRepository.create(promptData);

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
    if (isAdmin) {
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
   * @param {String} id - 提示词ID
   * @param {Object} data - 更新数据
   * @param {String} userId - 用户ID
   * @param {String} adminId - 管理员ID
   * @param {String} ipAddress - IP地址
   * @param {String} userRole - 用户角色
   */
  async updatePrompt(id, data, userId = null, adminId = null, ipAddress = null, userRole = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    const isAdmin = adminId && isAdminRole(userRole);

    // 权限检查：带有"系统"的类型只能管理员更新
    if (isSystemType(prompt.type) && !isAdmin) {
      throw new ForbiddenError('Only admin can update system-related prompts');
    }

    // 终端用户提示词（user）：只能更新自己的，管理员可以更新所有
    if (prompt.type === 'user') {
      if (!isAdmin && prompt.userId !== userId) {
        throw new ForbiddenError('Permission denied: can only update your own prompts');
      }
    }

    // 验证 functionKey 更新：如果提供了 functionKey，检查唯一性
    if (data.functionKey !== undefined && data.functionKey !== prompt.functionKey) {
      const existingByFunctionKey = await promptRepository.findByFunctionKey(data.functionKey);
      if (existingByFunctionKey) {
        throw new ConflictError('Function key already exists');
      }
    }

    // 验证 systemId 更新：如果提供了 systemId，必须是 system 类型的提示词
    if (data.systemId !== undefined) {
      if (data.systemId === null) {
        // 允许清除关联
        data.systemId = null;
      } else {
        const systemPrompt = await promptRepository.findById(data.systemId);
        if (!systemPrompt) {
          throw new NotFoundError('System prompt not found');
        }
        if (systemPrompt.type !== 'system') {
          throw new BadRequestError('systemId must point to a system type prompt');
        }
        // system_user 和 user 类型可以关联 system
        if (prompt.type !== 'system_user' && prompt.type !== 'user') {
          throw new BadRequestError('Only system_user and user types can have systemId');
        }
      }
    }

    const updated = await promptRepository.update(id, data, adminId || userId);

    // 记录操作日志
    if (isAdmin) {
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
   * @param {String} id - 提示词ID
   * @param {String} userId - 用户ID
   * @param {String} adminId - 管理员ID
   * @param {String} ipAddress - IP地址
   * @param {String} userRole - 用户角色
   */
  async deletePrompt(id, userId = null, adminId = null, ipAddress = null, userRole = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    const isAdmin = adminId && isAdminRole(userRole);

    // 权限检查：带有"系统"的类型只能管理员删除
    if (isSystemType(prompt.type) && !isAdmin) {
      throw new ForbiddenError('Only admin can delete system-related prompts');
    }

    // 终端用户提示词（user）：只能删除自己的，管理员可以删除所有
    if (prompt.type === 'user') {
      if (!isAdmin && prompt.userId !== userId) {
        throw new ForbiddenError('Permission denied: can only delete your own prompts');
      }
    }

    await promptRepository.delete(id);

    // 记录操作日志
    if (isAdmin) {
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
   * @param {String} id - 提示词ID
   * @param {Number} version - 版本号
   * @param {String} adminId - 管理员ID
   * @param {String} ipAddress - IP地址
   * @param {String} userRole - 用户角色
   * @param {String} userId - 用户ID（终端用户需要）
   */
  async rollbackPrompt(id, version, adminId = null, ipAddress = null, userRole = null, userId = null) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    const isAdmin = adminId && isAdminRole(userRole);

    // 权限检查：带有"系统"的类型只能管理员回滚
    if (isSystemType(prompt.type) && !isAdmin) {
      throw new ForbiddenError('Only admin can rollback system-related prompts');
    }

    // 终端用户提示词（user）：只能回滚自己的，管理员可以回滚所有
    if (prompt.type === 'user') {
      if (!isAdmin && prompt.userId !== userId) {
        throw new ForbiddenError('Permission denied: can only rollback your own prompts');
      }
    }

    const rolledBack = await promptRepository.rollbackToVersion(id, version, adminId || userId);

    // 记录操作日志
    if (isAdmin) {
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
module.exports.isAdminRole = isAdminRole;
module.exports.isTerminalUserRole = isTerminalUserRole;
module.exports.isSystemType = isSystemType;