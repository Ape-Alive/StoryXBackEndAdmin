const deviceService = require('../services/device.service');
const ResponseHandler = require('../utils/response');

/**
 * 设备控制器
 */
class DeviceController {
  /**
   * 获取设备列表（管理员）
   */
  async getDevices(req, res, next) {
    try {
      const filters = {
        deviceId: req.query.deviceId,
        userId: req.query.userId,
        deviceFingerprint: req.query.deviceFingerprint,
        status: req.query.status,
        ipAddress: req.query.ipAddress,
        lastUsedStart: req.query.lastUsedStart,
        lastUsedEnd: req.query.lastUsedEnd,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const sort = {
        orderBy: req.query.orderBy || 'lastUsedAt',
        order: req.query.order || 'desc'
      };

      const result = await deviceService.getDevices(filters, pagination, sort);

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
   * 获取用户设备列表（终端用户）
   */
  async getUserDevices(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHandler.error(res, 'User ID not found', 401);
      }

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const filters = {
        status: req.query.status
      };

      const result = await deviceService.getUserDevices(userId, pagination, filters);

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
   * 获取设备详情
   */
  async getDeviceDetail(req, res, next) {
    try {
      const { id } = req.params;
      const device = await deviceService.getDeviceDetail(id);
      return ResponseHandler.success(res, device, 'Device detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户当前设备信息（终端用户）
   */
  async getCurrentDevice(req, res, next) {
    try {
      const userId = req.user?.id;
      const deviceFingerprint = req.query.deviceFingerprint || req.body.deviceFingerprint;

      if (!userId) {
        return ResponseHandler.error(res, 'User ID not found', 401);
      }
      if (!deviceFingerprint) {
        return ResponseHandler.error(res, 'Device fingerprint is required', 400);
      }

      const device = await deviceService.getCurrentDevice(userId, deviceFingerprint);
      return ResponseHandler.success(res, device, 'Current device retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户设备数量上限（终端用户）
   */
  async getDeviceLimit(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHandler.error(res, 'User ID not found', 401);
      }

      const limit = await deviceService.getDeviceLimit(userId);
      return ResponseHandler.success(res, limit, 'Device limit retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新设备信息（终端用户）
   */
  async updateDevice(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHandler.error(res, 'User ID not found', 401);
      }

      const updated = await deviceService.updateDevice(id, userId, req.body);
      return ResponseHandler.success(res, updated, 'Device updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新设备信息（管理员）
   */
  async updateDeviceByAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await deviceService.updateDeviceByAdmin(id, req.body);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'UPDATE_DEVICE',
        targetType: 'device',
        targetId: id,
        details: req.body,
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, updated, 'Device updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 解绑设备（终端用户）
   */
  async revokeDevice(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHandler.error(res, 'User ID not found', 401);
      }

      const updated = await deviceService.revokeDevice(id, userId);
      return ResponseHandler.success(res, updated, 'Device revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 强制解绑设备（管理员）
   */
  async revokeDeviceByAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await deviceService.revokeDeviceByAdmin(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, updated, 'Device revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 恢复设备（管理员）
   */
  async allowDevice(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await deviceService.allowDevice(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, updated, 'Device allowed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量更新状态（管理员）
   */
  async batchUpdateStatus(req, res, next) {
    try {
      const { ids, status } = req.body;
      const result = await deviceService.batchUpdateStatus(ids, status, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'Device statuses updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除（管理员）
   */
  async batchDelete(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await deviceService.batchDelete(ids, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'Devices deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeviceController();

