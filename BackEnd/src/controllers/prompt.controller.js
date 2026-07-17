const promptService = require('../services/prompt.service');
const ResponseHandler = require('../utils/response');
const { resolveCatalogRoleContext } = require('../utils/resolveCatalogRoleContext');
const { stripCatalogRoleMeta } = require('../utils/providerSanitizer');

function isTerminalUser(req) {
  return req.user?.type === 'user';
}

function sanitizeCatalogPayload(req, payload) {
  if (!isTerminalUser(req) || payload == null) return payload;
  if (Array.isArray(payload)) return payload.map(stripCatalogRoleMeta);
  return stripCatalogRoleMeta(payload);
}

/**
 * 提示词控制器
 */
class PromptController {
  /**
   * 获取提示词列表
   */
  async getPrompts(req, res, next) {
    try {
      const filters = {
        title: req.query.title,
        categoryId: req.query.categoryId,
        type: req.query.type,
        userId: req.query.userId,
        systemId: req.query.systemId,
        isActive: req.query.isActive,
        tags: req.query.tags,
        createdAt: {
          gte: req.query.startDate,
          lte: req.query.endDate
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const sort = {
        createdAt: req.query.order === 'asc' ? 'asc' : 'desc',
        title: req.query.orderBy === 'title' ? (req.query.order === 'asc' ? 'asc' : 'desc') : undefined
      };

      const userRole = req.user?.role;
      const userId = req.user?.id;
      const catalogRoleContext = await resolveCatalogRoleContext(req);
      // query.userId 表示「当前用户」（角色过滤），不是提示词归属筛选项
      if (catalogRoleContext) {
        delete filters.userId;
      }

      const result = await promptService.getPrompts(
        filters,
        pagination,
        sort,
        userRole,
        userId,
        catalogRoleContext,
      );

      return ResponseHandler.paginated(res, sanitizeCatalogPayload(req, result.data), {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取提示词详情
   */
  async getPromptDetail(req, res, next) {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const catalogRoleContext = await resolveCatalogRoleContext(req);
      const prompt = await promptService.getPromptDetail(
        id,
        userRole,
        userId,
        catalogRoleContext,
      );
      return ResponseHandler.success(
        res,
        sanitizeCatalogPayload(req, prompt),
        'Prompt detail retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建提示词
   */
  async createPrompt(req, res, next) {
    try {
      const data = req.body;
      const userId = req.user?.id;
      const adminId = req.user?.id;
      const userRole = req.user?.role;
      const prompt = await promptService.createPrompt(data, userId, adminId, req.ip, userRole);
      return ResponseHandler.success(res, prompt, 'Prompt created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新提示词
   */
  async updatePrompt(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = req.user?.id;
      const adminId = req.user?.id;
      const userRole = req.user?.role;
      const prompt = await promptService.updatePrompt(id, data, userId, adminId, req.ip, userRole);
      return ResponseHandler.success(res, prompt, 'Prompt updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除提示词
   */
  async deletePrompt(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const adminId = req.user?.id;
      const userRole = req.user?.role;
      await promptService.deletePrompt(id, userId, adminId, req.ip, userRole);
      return ResponseHandler.success(res, null, 'Prompt deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取提示词版本列表
   */
  async getPromptVersions(req, res, next) {
    try {
      const { id } = req.params;
      const catalogRoleContext = await resolveCatalogRoleContext(req);
      // 先做可见性校验，避免仅靠 ID 拉取版本内容
      await promptService.getPromptDetail(
        id,
        req.user?.role,
        req.user?.id,
        catalogRoleContext,
      );
      const versions = await promptService.getPromptVersions(id);
      return ResponseHandler.success(res, versions, 'Prompt versions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 回滚提示词到指定版本
   */
  async rollbackPrompt(req, res, next) {
    try {
      const { id } = req.params;
      const { version } = req.body;
      const adminId = req.user?.id;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const prompt = await promptService.rollbackPrompt(id, version, adminId, req.ip, userRole, userId);
      return ResponseHandler.success(res, prompt, 'Prompt rolled back successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取提示词分类列表
   */
  async getCategories(req, res, next) {
    try {
      const filters = {
        type: req.query.type,
        name: req.query.name
      };
      const categories = await promptService.getCategories(filters);
      return ResponseHandler.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建提示词分类
   */
  async createCategory(req, res, next) {
    try {
      const data = req.body;
      const category = await promptService.createCategory(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新提示词分类
   */
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const category = await promptService.updateCategory(id, data, req.user?.id, req.ip);
      return ResponseHandler.success(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除提示词分类
   */
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      await promptService.deleteCategory(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PromptController();
