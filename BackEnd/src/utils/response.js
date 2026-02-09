/**
 * 统一响应格式工具
 */
class ResponseHandler {
  /**
   * 成功响应
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    // 处理 BigInt 和 Date 序列化问题
    const jsonString = JSON.stringify({
      success: true,
      message,
      data
    }, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      // 处理 Date 对象
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    return res.status(statusCode).send(jsonString);
  }

  /**
   * 分页响应
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.pageSize)
      }
    });
  }

  /**
   * 错误响应
   */
  static error(res, message = 'Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }
}

module.exports = ResponseHandler;
