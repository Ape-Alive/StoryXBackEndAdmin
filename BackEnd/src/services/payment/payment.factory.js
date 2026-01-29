const YunGouOSProvider = require('./providers/yungouos.provider');
// 后续可以添加其他支付平台
// const WeChatOfficialProvider = require('./providers/wechat-official.provider');
// const AlipayOfficialProvider = require('./providers/alipay-official.provider');
// const StripeProvider = require('./providers/stripe.provider');

/**
 * 支付平台工厂类
 * 根据平台名称创建对应的支付提供者实例
 */
class PaymentFactory {
  /**
   * 创建支付提供者实例
   * @param {String} platform - 平台名称（yungouos, wechat_official, alipay_official, stripe）
   * @param {Object} config - 平台配置
   * @returns {PaymentProvider} 支付提供者实例
   */
  static createProvider(platform, config) {
    switch (platform) {
      case 'yungouos':
        return new YunGouOSProvider({
          mchId: config.mchId || process.env.YUNGOUOS_MCH_ID,
          apiKey: config.apiKey || process.env.YUNGOUOS_API_KEY,
          apiBaseUrl: config.apiBaseUrl || process.env.YUNGOUOS_API_BASE_URL,
          notifyUrl: config.notifyUrl || process.env.YUNGOUOS_NOTIFY_URL,
          returnUrl: config.returnUrl || process.env.YUNGOUOS_RETURN_URL
        });

      // 后续可以添加其他平台
      // case 'wechat_official':
      //   return new WeChatOfficialProvider(config);
      // case 'alipay_official':
      //   return new AlipayOfficialProvider(config);
      // case 'stripe':
      //   return new StripeProvider(config);

      default:
        throw new Error(`Unsupported payment platform: ${platform}`);
    }
  }

  /**
   * 获取所有支持的支付平台列表
   * @returns {Array<String>} 平台名称列表
   */
  static getSupportedPlatforms() {
    return ['yungouos'];
    // 后续添加其他平台时，更新此列表
    // return ['yungouos', 'wechat_official', 'alipay_official', 'stripe'];
  }
}

module.exports = PaymentFactory;

