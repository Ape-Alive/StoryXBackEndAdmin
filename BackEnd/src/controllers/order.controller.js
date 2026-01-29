const orderService = require('../services/order.service');
const ResponseHandler = require('../utils/response');

/**
 * 订单控制器
 */
class OrderController {
  /**
   * 创建订单
   */
  async createOrder(req, res, next) {
    try {
      const { packageId, type } = req.body;
      const userId = req.user.id; // 从 JWT 中获取用户ID

      const order = await orderService.createOrder(userId, packageId, type);
      return ResponseHandler.success(res, order, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取我的订单列表
   */
  async getMyOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        userId,
        status: req.query.status,
        type: req.query.type,
        orderNo: req.query.orderNo
      };
      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20
      };
      const sort = {
        orderBy: req.query.orderBy || 'createdAt',
        order: req.query.order || 'desc'
      };

      const result = await orderService.getOrders(filters, pagination, sort);
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
   * 获取订单详情
   */
  async getOrderDetail(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const order = await orderService.getOrderDetail(id, userId);
      return ResponseHandler.success(res, order, 'Order detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await orderService.cancelOrder(id, userId);
      return ResponseHandler.success(res, null, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 管理员查询订单列表
   */
  async getOrders(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        status: req.query.status,
        type: req.query.type,
        orderNo: req.query.orderNo,
        packageId: req.query.packageId,
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
        orderBy: req.query.orderBy || 'createdAt',
        order: req.query.order || 'desc'
      };

      const result = await orderService.getOrders(filters, pagination, sort);
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
   * 管理员查询订单详情
   */
  async getAdminOrderDetail(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderDetail(id);
      return ResponseHandler.success(res, order, 'Order detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

