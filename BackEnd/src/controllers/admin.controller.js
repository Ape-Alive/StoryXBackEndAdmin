const adminService = require('../services/admin.service');
const ResponseHandler = require('../utils/response');

/**
 * 管理员控制器
 */
class AdminController {
  /**
   * 获取管理员列表
   */
  async getAdmins(req, res, next) {
    try {
      const filters = {
        adminId: req.query.adminId,
        username: req.query.username,
        email: req.query.email,
        role: req.query.role,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        lastLoginStart: req.query.lastLoginStart,
        lastLoginEnd: req.query.lastLoginEnd
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const sort = {
        orderBy: req.query.orderBy || 'createdAt',
        order: req.query.order || 'desc'
      };

      const result = await adminService.getAdmins(filters, pagination, sort);

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
   * 获取管理员详情
   */
  async getAdminDetail(req, res, next) {
    try {
      const { id } = req.params;
      const adminDetail = await adminService.getAdminDetail(id);
      return ResponseHandler.success(res, adminDetail, 'Admin detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建管理员
   */
  async createAdmin(req, res, next) {
    try {
      const admin = await adminService.createAdmin(req.body, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'CREATE_ADMIN',
        targetType: 'admin',
        targetId: admin.id,
        details: { username: admin.username, email: admin.email, role: admin.role },
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, admin, 'Admin created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新管理员
   */
  async updateAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await adminService.updateAdmin(id, req.body, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'UPDATE_ADMIN',
        targetType: 'admin',
        targetId: id,
        details: req.body,
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, updated, 'Admin updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新管理员状态
   */
  async updateAdminStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await adminService.updateAdminStatus(id, status, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'UPDATE_ADMIN_STATUS',
        targetType: 'admin',
        targetId: id,
        details: { status },
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, updated, 'Admin status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新管理员角色
   */
  async updateAdminRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const updated = await adminService.updateAdminRole(id, role, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'UPDATE_ADMIN_ROLE',
        targetType: 'admin',
        targetId: id,
        details: { role },
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, updated, 'Admin role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除管理员
   */
  async deleteAdmin(req, res, next) {
    try {
      const { id } = req.params;
      await adminService.deleteAdmin(id, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'DELETE_ADMIN',
        targetType: 'admin',
        targetId: id,
        details: {},
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, null, 'Admin deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(req, res, next) {
    try {
      const { ids, status } = req.body;
      const result = await adminService.batchUpdateStatus(ids, status, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'BATCH_UPDATE_ADMIN_STATUS',
        targetType: 'admin',
        targetId: null,
        details: { ids, status, count: result.count },
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, result, 'Admin statuses updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除
   */
  async batchDelete(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await adminService.batchDelete(ids, req.user?.id);

      // 记录操作日志
      const logService = require('../services/log.service');
      await logService.logAdminAction({
        adminId: req.user?.id,
        action: 'BATCH_DELETE_ADMIN',
        targetType: 'admin',
        targetId: null,
        details: { ids, count: result.count },
        ipAddress: req.ip
      });

      return ResponseHandler.success(res, result, 'Admins deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出管理员数据
   */
  async exportAdmins(req, res, next) {
    try {
      const filters = {
        adminId: req.query.adminId,
        username: req.query.username,
        email: req.query.email,
        role: req.query.role,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const admins = await adminService.exportAdmins(filters);

      // TODO: 将数据转换为 CSV/Excel 格式
      // 这里仅返回 JSON 数据，实际应该生成文件并下载
      return ResponseHandler.success(res, admins, 'Admins exported successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();

