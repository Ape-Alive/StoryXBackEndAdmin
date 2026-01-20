const authorizationRepository = require('../repositories/authorization.repository');
const { NotFoundError } = require('../utils/errors');

/**
 * 授权业务逻辑层
 */
class AuthorizationService {
  /**
   * 获取授权记录列表
   */
  async getAuthorizations(filters = {}, pagination = {}) {
    return await authorizationRepository.findAuthorizations(filters, pagination);
  }

  /**
   * 获取授权记录详情
   */
  async getAuthorizationDetail(id) {
    const authorization = await authorizationRepository.findById(id);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }
    return authorization;
  }

  /**
   * 根据 sessionToken 获取授权记录
   */
  async getBySessionToken(sessionToken) {
    const authorization = await authorizationRepository.findBySessionToken(sessionToken);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }
    return authorization;
  }

  /**
   * 撤销授权
   */
  async revokeAuthorization(id, adminId = null, ipAddress = null) {
    const authorization = await authorizationRepository.findById(id);
    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }

    await authorizationRepository.revoke(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'REVOKE_AUTHORIZATION',
        targetType: 'authorization',
        targetId: id,
        details: {
          userId: authorization.userId,
          modelId: authorization.modelId,
          sessionToken: authorization.sessionToken
        },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 获取用户授权统计
   */
  async getUserAuthorizationStats(userId) {
    return await authorizationRepository.getUserAuthorizationStats(userId);
  }
}

module.exports = new AuthorizationService();
