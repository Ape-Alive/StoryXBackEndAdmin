const packageService = require('../services/package.service');
const ResponseHandler = require('../utils/response');

/**
 * 套餐控制器
 */
class PackageController {
  /**
   * 获取套餐列表
   */
  async getPackages(req, res, next) {
    try {
      const filters = {
        name: req.query.name,
        displayName: req.query.displayName,
        type: req.query.type,
        isActive: req.query.isActive,
        isStackable: req.query.isStackable,
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
        priority: req.query.orderBy === 'priority' ? (req.query.order === 'asc' ? 'asc' : 'desc') : undefined
      };

      const result = await packageService.getPackages(filters, pagination, sort);

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
   * 获取套餐详情
   */
  async getPackageDetail(req, res, next) {
    try {
      const { id } = req.params;
      const pkg = await packageService.getPackageDetail(id);
      return ResponseHandler.success(res, pkg, 'Package detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建套餐
   */
  async createPackage(req, res, next) {
    try {
      const data = req.body;
      const pkg = await packageService.createPackage(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, pkg, 'Package created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新套餐
   */
  async updatePackage(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const pkg = await packageService.updatePackage(id, data, req.user?.id, req.ip);
      return ResponseHandler.success(res, pkg, 'Package updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除套餐
   */
  async deletePackage(req, res, next) {
    try {
      const { id } = req.params;
      await packageService.deletePackage(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Package deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 复制套餐
   */
  async duplicatePackage(req, res, next) {
    try {
      const { id } = req.params;
      const { newName, newDisplayName } = req.body;
      const pkg = await packageService.duplicatePackage(id, newName, newDisplayName, req.user?.id, req.ip);
      return ResponseHandler.success(res, pkg, 'Package duplicated successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PackageController();
