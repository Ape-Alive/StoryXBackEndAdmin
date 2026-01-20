const userPackageService = require('../services/userPackage.service');
const ResponseHandler = require('../utils/response');

/**
 * 用户套餐控制器
 */
class UserPackageController {
  /**
   * 获取用户套餐列表
   */
  async getUserPackages(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        packageId: req.query.packageId,
        activeOnly: req.query.activeOnly === 'true',
        expiresAt: {
          lte: req.query.expiresBefore
        }
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };

      const result = await userPackageService.getUserPackages(filters, pagination);

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
   * 获取用户套餐详情
   */
  async getUserPackageDetail(req, res, next) {
    try {
      const { id } = req.params;
      const userPackage = await userPackageService.getUserPackageDetail(id);
      return ResponseHandler.success(res, userPackage, 'User package detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 分配套餐给用户
   */
  async assignPackage(req, res, next) {
    try {
      const data = req.body;
      const userPackage = await userPackageService.assignPackage(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, userPackage, 'Package assigned successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新套餐优先级
   */
  async updatePriority(req, res, next) {
    try {
      const { id } = req.params;
      const { priority } = req.body;
      const userPackage = await userPackageService.updatePriority(id, priority, req.user?.id, req.ip);
      return ResponseHandler.success(res, userPackage, 'Priority updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 延期套餐
   */
  async extendPackage(req, res, next) {
    try {
      const { id } = req.params;
      const { days } = req.body;
      const userPackage = await userPackageService.extendPackage(id, days, req.user?.id, req.ip);
      return ResponseHandler.success(res, userPackage, 'Package extended successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消用户套餐
   */
  async cancelUserPackage(req, res, next) {
    try {
      const { id } = req.params;
      await userPackageService.cancelUserPackage(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'User package cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户的活跃套餐列表
   */
  async getUserActivePackages(req, res, next) {
    try {
      const { userId } = req.params;
      const packages = await userPackageService.getUserActivePackages(userId);
      return ResponseHandler.success(res, packages, 'Active packages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserPackageController();
