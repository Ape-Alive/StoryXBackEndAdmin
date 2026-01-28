const userService = require('../services/user.service');
const ResponseHandler = require('../utils/response');

/**
 * 用户控制器
 */
class UserController {
  /**
   * 获取用户列表
   */
  async getUsers(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        email: req.query.email,
        phone: req.query.phone,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const sort = {
        orderBy: req.query.orderBy || 'createdAt',
        order: req.query.order || 'desc'
      };

      const result = await userService.getUsers(filters, pagination, sort);

      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(req, res, next) {
    try {
      const { userId } = req.params;
      const userDetail = await userService.getUserDetail(userId);
      return ResponseHandler.success(res, userDetail, 'User detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, reason, banDuration } = req.body;

      await userService.updateUserStatus(
        userId,
        status,
        reason,
        banDuration,
        req.user?.id,
        req.ip
      );
      return ResponseHandler.success(res, null, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户设备列表
   */
  async getUserDevices(req, res, next) {
    try {
      const { userId } = req.params;
      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };
      const result = await userService.getUserDevices(userId, pagination);
      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 强制解绑设备
   */
  async unbindDevice(req, res, next) {
    try {
      const { userId } = req.params;
      const { deviceId } = req.body;

      await userService.unbindDevice(userId, deviceId, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Device unbound successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const updated = await userService.updateUser(userId, req.body, req.user?.id, req.ip);
      return ResponseHandler.success(res, updated, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量更新用户状态
   */
  async batchUpdateStatus(req, res, next) {
    try {
      const { ids, status, reason, banDuration } = req.body;
      const result = await userService.batchUpdateStatus(ids, status, reason, banDuration, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'User statuses updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量解绑设备
   */
  async batchUnbindDevices(req, res, next) {
    try {
      const { userId } = req.params;
      const { deviceIds } = req.body;
      const result = await userService.batchUnbindDevices(userId, deviceIds, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'Devices unbound successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除用户
   */
  async batchDeleteUsers(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await userService.batchDeleteUsers(ids, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'Users deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出用户数据
   */
  async exportUsers(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        email: req.query.email,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const users = await userService.exportUsers(filters);

      // TODO: 将数据转换为 CSV/Excel 格式
      // 这里仅返回 JSON 数据，实际应该生成文件并下载
      return ResponseHandler.success(res, users, 'Users exported successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
