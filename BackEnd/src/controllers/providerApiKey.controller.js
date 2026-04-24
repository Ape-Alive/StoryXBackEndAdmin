const userApiKeyService = require('../services/userApiKey.service');
const ResponseHandler = require('../utils/response');

/**
 * 提供商API Key控制器（管理员）
 */
class ProviderApiKeyController {
  /**
   * 获取提供商的API Key列表
   */
  async getProviderApiKeys(req, res, next) {
    try {
      const { id } = req.params;
      const { userId, status } = req.query;

      const filters = {};
      // 处理 userId 参数：
      // - 'null' 或 null 或 undefined：查询系统级API Key（userId为null）
      // - 不传 userId 参数：查询所有API Key（包括系统级和用户级）
      // - 传入具体 userId：查询该用户的API Key
      if (userId === 'null') {
        filters.userId = null; // 系统级API Key
      } else if (userId && userId !== 'undefined') {
        filters.userId = userId; // 特定用户的API Key
      }
      // 如果 userId 是 undefined 或不传，则不添加 userId 条件，查询所有API Key
      
      if (status) filters.status = status;

      const apiKeys = await userApiKeyService.getProviderApiKeys(id, filters);
      return ResponseHandler.success(res, apiKeys, 'Provider API Keys retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 为提供商添加关联API Key
   */
  async addProviderApiKey(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { apiKey, name, apiKeyId, credits, expireTime, voiceLimit } = req.body;

      // 处理过期时间
      let expireTimeValue = 0;
      if (expireTime) {
        if (typeof expireTime === 'string') {
          expireTimeValue = Math.floor(new Date(expireTime).getTime() / 1000);
        } else if (typeof expireTime === 'number') {
          expireTimeValue = expireTime;
        }
      }

      const result = await userApiKeyService.addProviderApiKey(id, {
        apiKey,
        name,
        apiKeyId,
        credits: credits || 0,
        expireTime: expireTimeValue,
        voiceLimit: voiceLimit || 0
      }, adminId);

      return ResponseHandler.success(
        res,
        result,
        'Provider API Key added successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除提供商的关联API Key
   */
  async deleteProviderApiKey(req, res, next) {
    try {
      const { id, apiKeyId } = req.params;
      const adminId = req.user.id;

      await userApiKeyService.deleteProviderApiKey(id, apiKeyId, adminId);
      return ResponseHandler.success(res, null, 'Provider API Key deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 调整提供商关联API Key额度（管理员）
   * - credits 表示该 API Key 的总额度
   */
  async adjustProviderApiKeyCredits(req, res, next) {
    try {
      const { id, apiKeyId } = req.params;
      const adminId = req.user.id;
      const { credits } = req.body;

      const updated = await userApiKeyService.adjustProviderApiKeyCredits(id, apiKeyId, credits, adminId);
      return ResponseHandler.success(res, updated, 'Provider API Key credits updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 该 API Key 在「音色克隆」流程中产生的音色列表（meta 中记录 userApiKeyId）
   */
  /**
   * 返回解密后的上游 API Key（仅超级/平台管理员；用于管理端上传工具）
   */
  async revealProviderApiKeyToken(req, res, next) {
    try {
      const { id, apiKeyId } = req.params;
      const result = await userApiKeyService.getDecryptedTokenForProviderApiKey(id, apiKeyId);
      return ResponseHandler.success(res, result, 'OK');
    } catch (error) {
      next(error);
    }
  }

  async getClonedVoicesForProviderApiKey(req, res, next) {
    try {
      const { id, apiKeyId } = req.params;
      const { page, pageSize } = req.query;
      const result = await userApiKeyService.getClonedVoiceProfilesForProviderApiKey(id, apiKeyId, {
        page,
        pageSize,
      });
      return ResponseHandler.paginated(
        res,
        result.data,
        { page: result.page, pageSize: result.pageSize, total: result.total },
        'Cloned voice profiles retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProviderApiKeyController();
