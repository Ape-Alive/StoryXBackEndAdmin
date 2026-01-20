const userRepository = require('../repositories/user.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { USER_STATUS } = require('../constants/userStatus');

/**
 * 用户业务逻辑层
 */
class UserService {
  /**
   * 获取用户列表
   */
  async getUsers(filters = {}, pagination = {}, sort = {}) {
    // 构建查询条件
    const queryFilters = {};

    if (filters.userId) {
      queryFilters.id = filters.userId;
    }

    if (filters.email || filters.phone) {
      queryFilters.$or = [];
      if (filters.email) queryFilters.$or.push({ email: filters.email });
      if (filters.phone) queryFilters.$or.push({ phone: filters.phone });
    }

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      queryFilters.createdAt = {};
      if (filters.startDate) queryFilters.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) queryFilters.createdAt.$lte = new Date(filters.endDate);
    }

    // 构建排序
    const sortOrder = {};
    if (sort.orderBy) {
      const order = sort.order === 'desc' ? 'DESC' : 'ASC';
      sortOrder[sort.orderBy] = order;
    } else {
      sortOrder.createdAt = 'DESC'; // 默认按注册时间倒序
    }

    // 获取数据
    const result = await userRepository.findUsers(
      queryFilters,
      {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 20
      },
      sortOrder
    );

    return result;
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(userId) {
    const user = await userRepository.findUserDetail(userId);

    // 获取用户使用统计
    const [stats7Days, stats30Days] = await Promise.all([
      userRepository.getUserStatistics(userId, 7),
      userRepository.getUserStatistics(userId, 30)
    ]);

    const statistics = {
      callsLast7Days: stats7Days.callStats.reduce((sum, item) => sum + item._count, 0),
      callsLast30Days: stats30Days.callStats.reduce((sum, item) => sum + item._count, 0),
      tokenUsage: stats30Days.dailyStats,
      modelDistribution: stats30Days.modelDistribution,
      costStatistics: {
        last7Days: stats7Days.tokenStats,
        last30Days: stats30Days.tokenStats
      }
    };

    return {
      ...user,
      statistics
    };
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(userId, status, reason = null, banDuration = null, adminId = null, ipAddress = null) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 状态变更验证
    if (user.status === status) {
      throw new BadRequestError(`User is already ${status}`);
    }

    // 计算封禁到期时间
    let banUntil = null;
    if (status === USER_STATUS.BANNED && banDuration) {
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + banDuration);
    }

    // 执行状态更新
    await userRepository.updateStatus(userId, status, reason, banUntil);

    // 如果是封禁状态，需要使所有 Session 失效
    if (status === USER_STATUS.BANNED) {
      const prisma = require('../config/database');
      await prisma.authorization.updateMany({
        where: {
          userId,
          status: 'active'
        },
        data: {
          status: 'revoked',
          updatedAt: new Date()
        }
      });
    }

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_USER_STATUS',
        targetType: 'user',
        targetId: userId,
        details: { status, reason, banDuration, banUntil },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 获取用户设备列表
   */
  async getUserDevices(userId, pagination = {}) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const result = await userRepository.findUserDevices(userId, pagination);
    return result;
  }

  /**
   * 强制解绑设备
   */
  async unbindDevice(userId, deviceId, adminId = null, ipAddress = null) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await userRepository.unbindDevice(userId, deviceId);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UNBIND_DEVICE',
        targetType: 'device',
        targetId: deviceId,
        details: { userId, deviceId },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 批量导出用户数据
   */
  async exportUsers(filters = {}) {
    const users = await userRepository.exportUsers(filters);
    return users;
  }
}

module.exports = new UserService();
