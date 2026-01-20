const modelService = require('../services/model.service');
const ResponseHandler = require('../utils/response');

/**
 * 模型控制器
 */
class ModelController {
  /**
   * 获取模型列表
   */
  async getModels(req, res, next) {
    try {
      const filters = {
        name: req.query.name,
        displayName: req.query.displayName,
        baseUrl: req.query.baseUrl,
        type: req.query.type,
        category: req.query.category,
        providerId: req.query.providerId,
        isActive: req.query.isActive,
        requiresKey: req.query.requiresKey,
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

      const result = await modelService.getModels(filters, pagination, sort);

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
   * 获取模型详情
   */
  async getModelDetail(req, res, next) {
    try {
      const { id } = req.params;
      const model = await modelService.getModelDetail(id);
      return ResponseHandler.success(res, model, 'Model detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建模型
   */
  async createModel(req, res, next) {
    try {
      const data = req.body;
      const model = await modelService.createModel(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, model, 'Model created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新模型
   */
  async updateModel(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const model = await modelService.updateModel(id, data, req.user?.id, req.ip);
      return ResponseHandler.success(res, model, 'Model updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除模型
   */
  async deleteModel(req, res, next) {
    try {
      const { id } = req.params;
      await modelService.deleteModel(id, req.user?.id, req.ip);
      return ResponseHandler.success(res, null, 'Model deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量更新模型状态
   */
  async batchUpdateStatus(req, res, next) {
    try {
      const { ids, isActive } = req.body;
      const result = await modelService.batchUpdateStatus(ids, isActive, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'Models status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除模型
   */
  async batchDelete(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await modelService.batchDelete(ids, req.user?.id, req.ip);
      return ResponseHandler.success(res, result, 'Models deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新模型状态
   */
  async updateModelStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const model = await modelService.updateModelStatus(id, isActive, req.user?.id, req.ip);
      return ResponseHandler.success(res, model, 'Model status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取模型价格列表
   */
  async getModelPrices(req, res, next) {
    try {
      const { id } = req.params;
      const { packageId } = req.query;
      const prices = await modelService.getModelPrices(id, packageId || null);
      return ResponseHandler.success(res, prices, 'Model prices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建模型价格
   */
  async createModelPrice(req, res, next) {
    try {
      const { id } = req.params;
      const data = { ...req.body, modelId: id };
      const price = await modelService.createModelPrice(data, req.user?.id, req.ip);
      return ResponseHandler.success(res, price, 'Model price created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新模型价格
   */
  async updateModelPrice(req, res, next) {
    try {
      const { id, priceId } = req.params;
      const data = req.body;
      const price = await modelService.updateModelPrice(priceId, data, req.user?.id, req.ip);
      return ResponseHandler.success(res, price, 'Model price updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ModelController();
