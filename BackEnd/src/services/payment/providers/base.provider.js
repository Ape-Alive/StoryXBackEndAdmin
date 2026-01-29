/**
 * 支付平台抽象基类
 * 所有第三方支付平台都需要实现此接口
 */
class PaymentProvider {
  /**
   * 创建支付订单
   * @param {Object} orderData - 订单数据
   * @param {String} orderData.orderNo - 订单号
   * @param {String} orderData.amount - 支付金额（元）
   * @param {String} orderData.description - 商品描述
   * @param {String} orderData.notifyUrl - 回调通知地址
   * @param {String} orderData.returnUrl - 同步跳转地址（可选）
   * @param {Object} orderData.extra - 额外参数（平台特定）
   * @returns {Promise<Object>} 支付结果
   * @returns {String} paymentNo - 支付单号
   * @returns {String} qrCodeUrl - 二维码地址（Native 支付）
   * @returns {String} payUrl - 支付链接
   * @returns {String} thirdPartyNo - 第三方交易号
   */
  async createPayment(orderData) {
    throw new Error('createPayment method must be implemented');
  }

  /**
   * 验证回调签名
   * @param {Object} callbackData - 回调数据
   * @param {String} sign - 签名
   * @returns {Boolean} 签名是否有效
   */
  async verifyCallback(callbackData, sign) {
    throw new Error('verifyCallback method must be implemented');
  }

  /**
   * 查询支付状态
   * @param {String} thirdPartyNo - 第三方交易号
   * @returns {Promise<Object>} 支付状态
   * @returns {String} status - 支付状态（success, pending, failed）
   * @returns {String} amount - 支付金额
   * @returns {String} paidAt - 支付时间
   */
  async queryPaymentStatus(thirdPartyNo) {
    throw new Error('queryPaymentStatus method must be implemented');
  }

  /**
   * 处理回调数据
   * @param {Object} callbackData - 原始回调数据
   * @returns {Object} 标准化的回调数据
   * @returns {String} orderNo - 订单号
   * @returns {String} thirdPartyNo - 第三方交易号
   * @returns {String} status - 支付状态
   * @returns {String} amount - 支付金额
   * @returns {String} paidAt - 支付时间
   */
  parseCallback(callbackData) {
    throw new Error('parseCallback method must be implemented');
  }

  /**
   * 获取平台名称
   * @returns {String} 平台名称
   */
  getPlatformName() {
    throw new Error('getPlatformName method must be implemented');
  }
}

module.exports = PaymentProvider;

