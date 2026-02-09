const userApiKeyService = require('../services/userApiKey.service');
const ResponseHandler = require('../utils/response');

/**
 * 用户API Key控制器
 */
class UserApiKeyController {
  /**
   * 获取用户的API Key列表
   */
  async getUserApiKeys(req, res, next) {
    try {
      const userId = req.user.id;
      const { providerId, type, status } = req.query;

      const filters = {};
      if (providerId) filters.providerId = providerId;
      if (type) filters.type = type;
      if (status) filters.status = status;

      const apiKeys = await userApiKeyService.getUserApiKeys(userId, filters);
      return ResponseHandler.success(res, apiKeys, 'API Keys retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取API Key详情
   */
  async getApiKeyDetail(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const apiKey = await userApiKeyService.getApiKeyDetail(id, userId);
      return ResponseHandler.success(res, apiKey, 'API Key retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 用户创建API Key
   */
  async createUserApiKey(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, expireTime } = req.body;

      const result = await userApiKeyService.createUserApiKey(userId, {
        name,
        expireTime
      });

      return ResponseHandler.success(
        res,
        result,
        'API Keys created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除用户API Key
   */
  async deleteUserApiKey(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await userApiKeyService.deleteUserApiKey(id, userId);
      return ResponseHandler.success(res, null, 'API Key deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserApiKeyController();
