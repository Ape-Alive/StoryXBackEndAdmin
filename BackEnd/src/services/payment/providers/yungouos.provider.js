const axios = require('axios');
const crypto = require('crypto');
const PaymentProvider = require('./base.provider');
const { BadRequestError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');

/**
 * 将 yyyy-MM-dd HH:mm:ss 格式转换为 Date 对象
 * @param {String} timeStr - 时间字符串
 * @returns {Date} Date 对象
 */
function parseYunGouOSTime(timeStr) {
  if (!timeStr) return null;
  try {
    // 将 yyyy-MM-dd HH:mm:ss 转换为 ISO 格式
    const isoStr = timeStr.replace(' ', 'T');
    return new Date(isoStr);
  } catch (e) {
    logger.warn('Failed to parse YunGouOS time format', { time: timeStr, error: e.message });
    return null;
  }
}

/**
 * YunGouOS 支付平台实现
 */
class YunGouOSProvider extends PaymentProvider {
  constructor(config) {
    super();
    this.config = {
      apiBaseUrl: config.apiBaseUrl || 'https://api.pay.yungouos.com',
      mchId: config.mchId,
      apiKey: config.apiKey,
      notifyUrl: config.notifyUrl,
      returnUrl: config.returnUrl
    };

    if (!this.config.mchId || !this.config.apiKey) {
      throw new Error('YunGouOS mchId and apiKey are required');
    }
  }

  /**
   * 生成签名（微信官方签名算法）
   * 签名生成的通用步骤：
   * 1. 设所有发送或者接收到的数据为集合M，将集合M内非空参数值的参数按照参数名ASCII码从小到大排序（字典序）
   * 2. 使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串stringA
   * 3. 在stringA最后拼接上 &key=密钥 得到stringSignTemp字符串
   * 4. 对stringSignTemp进行MD5运算，再将得到的字符串所有字符转换为大写，得到sign值
   *
   * @param {Object} params - 参数对象
   * @returns {String} 签名（大写MD5）
   */
  generateSign(params) {
    // 1. 过滤空值和 sign 字段（sign 不参与签名）
    const filteredParams = {};
    for (const key in params) {
      const value = params[key];
      // 排除空值（null, undefined, 空字符串）和 sign 字段
      if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
        // 确保值为字符串类型
        filteredParams[key] = String(value);
      }
    }

    // 2. 按键名ASCII码从小到大排序（字典序）
    const sortedKeys = Object.keys(filteredParams).sort();

    // 3. 使用URL键值对格式拼接成字符串 stringA（key1=value1&key2=value2...）
    const stringArr = [];
    for (const key of sortedKeys) {
      stringArr.push(`${key}=${filteredParams[key]}`);
    }

    // 4. 在 stringA 最后拼接上 &key=密钥 得到 stringSignTemp
    stringArr.push(`key=${this.config.apiKey}`);
    const stringSignTemp = stringArr.join('&');

    // 5. 对 stringSignTemp 进行 MD5 运算，再将得到的字符串所有字符转换为大写
    const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();

    return sign;
  }

  /**
   * 创建支付订单（微信扫码支付 Native）
   * @param {Object} orderData - 订单数据
   * @returns {Promise<Object>} 支付结果
   */
  async createPayment(orderData) {
    const {
      orderNo,
      amount,
      description,
      notifyUrl,
      returnUrl,
      extra = {}
    } = orderData;

    // 验证金额（0.01 ~ 999999）
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.01 || amountNum > 999999) {
      throw new BadRequestError('Payment amount must be between 0.01 and 999999');
    }

    // 构建请求参数
    const params = {
      out_trade_no: orderNo,
      total_fee: amountNum.toFixed(2), // 必须使用字符串，保留两位小数
      mch_id: this.config.mchId,
      body: description || '套餐购买',
      type: extra.type || '2', // 1=微信原生支付链接，2=二维码图片地址
      notify_url: notifyUrl || this.config.notifyUrl,
      ...(returnUrl && { return_url: returnUrl || this.config.returnUrl }),
      ...(extra.attach && { attach: extra.attach }),
      ...(extra.app_id && { app_id: extra.app_id }),
      ...(extra.credit && { credit: extra.credit }),
      ...(extra.device_info && { device_info: extra.device_info }),
      ...(extra.end_time && { end_time: extra.end_time })
    };

    // 生成签名
    params.sign = this.generateSign(params);

    try {
      // 调用 YunGouOS API
      const response = await axios.post(
        `${this.config.apiBaseUrl}/api/pay/wxpay/nativePay`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000 // 10秒超时
        }
      );

      const { code, msg, data } = response.data;

      if (code !== 0) {
        logger.error('YunGouOS create payment failed', { code, msg, params: { orderNo, amount } });
        throw new BadRequestError(`YunGouOS payment failed: ${msg || 'Unknown error'}`);
      }

      // 返回支付结果
      return {
        paymentNo: orderNo, // 使用订单号作为支付单号
        qrCodeUrl: params.type === '2' ? data : null,
        payUrl: params.type === '1' ? data : null,
        thirdPartyNo: null, // YunGouOS 在回调时才返回交易号
        platformData: {
          code,
          msg,
          data
        }
      };
    } catch (error) {
      logger.error('YunGouOS create payment error', {
        error: error.message,
        stack: error.stack,
        params: { orderNo, amount }
      });

      if (error.response) {
        throw new BadRequestError(`YunGouOS API error: ${error.response.data?.msg || error.message}`);
      }
      throw new BadRequestError(`YunGouOS payment error: ${error.message}`);
    }
  }

  /**
   * 验证回调签名
   * 使用与生成签名相同的算法重新计算签名，然后与传入的签名比较
   *
   * @param {Object} callbackData - 回调数据（包含 sign 字段）
   * @param {String} sign - 待验证的签名
   * @returns {Boolean} 签名是否有效
   */
  async verifyCallback(callbackData, sign) {
    if (!sign) {
      logger.warn('Callback signature is missing', { callbackData });
      return false;
    }

    // 使用回调数据重新生成签名（sign 字段会自动被过滤）
    const calculatedSign = this.generateSign(callbackData);

    // 比较签名（不区分大小写，但我们的算法已经转大写了）
    const isValid = calculatedSign === sign.toUpperCase();

    if (!isValid) {
      logger.warn('Signature verification failed', {
        calculated: calculatedSign,
        received: sign,
        callbackData: { ...callbackData, sign: '[HIDDEN]' } // 隐藏签名，避免日志泄露
      });
    }

    return isValid;
  }

  /**
   * 查询支付状态（YunGouOS 可能不支持主动查询，需要查看文档）
   * @param {String} thirdPartyNo - 第三方交易号
   * @returns {Promise<Object>} 支付状态
   */
  async queryPaymentStatus(thirdPartyNo) {
    // TODO: 如果 YunGouOS 提供查询接口，在这里实现
    // 目前 YunGouOS 主要通过回调通知，不支持主动查询
    throw new BadRequestError('YunGouOS does not support active payment status query');
  }

  /**
   * 处理回调数据
   * @param {Object} callbackData - 原始回调数据
   * @returns {Object} 标准化的回调数据
   *
   * YunGouOS 回调参数：
   * - code: 支付结果（1=成功，0=失败）
   * - orderNo: YunGouOS系统内单号
   * - outTradeNo: 商户订单号（我们创建订单时传入的订单号）
   * - payNo: 支付单号（第三方支付单号）
   * - money: 支付金额（单位：元）
   * - mchId: 支付商户号
   * - payChannel: 支付渠道（wxpay、alipay）
   * - time: 支付成功时间（格式：yyyy-MM-dd HH:mm:ss）
   * - attach: 附加数据
   * - openId: 用户openId
   * - payBank: 用户付款渠道
   * - sign: 数据签名（不参与签名计算）
   */
  parseCallback(callbackData) {
    // code: 1=成功，0=失败
    const isSuccess = callbackData.code === '1' || callbackData.code === 1;

    // 解析支付时间（格式：yyyy-MM-dd HH:mm:ss）
    const paidAtDate = parseYunGouOSTime(callbackData.time);
    const paidAt = paidAtDate ? paidAtDate.toISOString() : new Date().toISOString();

    return {
      orderNo: callbackData.outTradeNo, // 商户订单号（我们系统的订单号）
      thirdPartyNo: callbackData.payNo || callbackData.orderNo, // 第三方支付单号或YunGouOS系统单号
      status: isSuccess ? 'success' : 'failed',
      amount: callbackData.money, // 支付金额（单位：元）
      paidAt: paidAt, // 支付成功时间
      rawData: callbackData
    };
  }

  /**
   * 获取平台名称
   * @returns {String} 平台名称
   */
  getPlatformName() {
    return 'yungouos';
  }
}

module.exports = YunGouOSProvider;

