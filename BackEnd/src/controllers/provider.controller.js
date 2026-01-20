const providerService = require('../services/provider.service');
const ResponseHandler = require('../utils/response');

/**
 * 提供商控制器
 */
class ProviderController {
  /**
   * 获取提供商列表
   */
  async getProviders(req, res, next) {
    try {
      const filters = {
        name: req.query.name,
        displayName: req.query.displayName,
        isActive: req.query.isActive,
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
        createdAt: req.query.order === 'asc' ? 'asc' : 'desc'
      };

      const result = await providerService.getProviders(filters, pagination, sort);

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
   * 获取提供商详情
   */
  async getProviderDetail(req, res, next) {
    try {
      const { id } = req.params;
      const provider = await providerService.getProviderDetail(id);
      return ResponseHandler.success(res, provider, 'Provider detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建提供商
   */
  async createProvider(req, res, next) {
    try {
      const data = req.body;
      const provider = await providerService.createProvider(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, provider, 'Provider created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新提供商
   */
  async updateProvider(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const provider = await providerService.updateProvider(id, data, req.user?.id, req.ip);
      return ResponseHandler.success(res, provider, 'Provider updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除提供商
   */
  async deleteProvider(req, res, next) {
    try {
      const { id } = req.params;
      await providerService.deleteProvider(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Provider deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新提供商状态
   */
  async updateProviderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const provider = await providerService.updateProviderStatus(id, isActive, req.user?.id, req.ip);
      return ResponseHandler.success(res, provider, 'Provider status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProviderController();
