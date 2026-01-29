/**
 * YunGouOS 签名算法测试
 * 用于验证签名生成和验证逻辑是否正确
 *
 * 运行测试：node src/services/payment/providers/__tests__/yungouos-sign.test.js
 */

const crypto = require('crypto');

/**
 * 签名生成函数（与 yungouos.provider.js 中的实现一致）
 */
function generateSign(params, apiKey) {
  // 1. 过滤空值和 sign 字段
  const filteredParams = {};
  for (const key in params) {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
      filteredParams[key] = String(value);
    }
  }

  // 2. 按键名ASCII码从小到大排序（字典序）
  const sortedKeys = Object.keys(filteredParams).sort();

  // 3. 使用URL键值对格式拼接成字符串 stringA
  const stringArr = [];
  for (const key of sortedKeys) {
    stringArr.push(`${key}=${filteredParams[key]}`);
  }

  // 4. 在 stringA 最后拼接上 &key=密钥
  stringArr.push(`key=${apiKey}`);
  const stringSignTemp = stringArr.join('&');

  // 5. MD5 运算并转大写
  const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();

  return sign;
}

// 测试用例
console.log('=== YunGouOS 签名算法测试 ===\n');

// 测试用例1：基本签名生成
const testParams1 = {
  out_trade_no: 'ORDER123456789',
  total_fee: '99.00',
  mch_id: '1234567890',
  body: '套餐购买',
  type: '2'
};

const apiKey = 'test_api_key_12345';
const sign1 = generateSign(testParams1, apiKey);
console.log('测试用例1：基本签名生成');
console.log('参数：', testParams1);
console.log('生成的签名：', sign1);
console.log('签名长度：', sign1.length, '(应该是32位)');
console.log('是否全大写：', sign1 === sign1.toUpperCase());
console.log('');

// 测试用例2：包含空值的参数
const testParams2 = {
  out_trade_no: 'ORDER123456789',
  total_fee: '99.00',
  mch_id: '1234567890',
  body: '套餐购买',
  type: '2',
  attach: '', // 空字符串，应该被过滤
  return_url: null, // null，应该被过滤
  sign: 'OLD_SIGN' // sign 字段，应该被过滤
};

const sign2 = generateSign(testParams2, apiKey);
console.log('测试用例2：包含空值的参数');
console.log('参数：', testParams2);
console.log('生成的签名：', sign2);
console.log('签名应该与测试用例1相同（因为空值被过滤）：', sign1 === sign2);
console.log('');

// 测试用例3：参数排序测试
const testParams3 = {
  z_param: 'z_value',
  a_param: 'a_value',
  m_param: 'm_value'
};

const sign3 = generateSign(testParams3, apiKey);
console.log('测试用例3：参数排序测试');
console.log('参数：', testParams3);
console.log('排序后的键：', Object.keys(testParams3).sort());
console.log('生成的签名：', sign3);
console.log('');

// 测试用例4：回调数据签名验证
const callbackData = {
  code: '1',
  orderNo: 'YUNGOUS_ORDER_123',
  outTradeNo: 'ORDER123456789',
  payNo: 'WX_PAY_NO_123',
  money: '99.00',
  mchId: '1234567890',
  payChannel: 'wxpay',
  time: '2024-01-28 12:00:00',
  sign: 'CALCULATED_SIGN'
};

const callbackSign = generateSign(callbackData, apiKey);
console.log('测试用例4：回调数据签名验证');
console.log('回调数据：', callbackData);
console.log('生成的签名：', callbackSign);
console.log('');

console.log('=== 测试完成 ===');
console.log('\n提示：');
console.log('1. 签名必须是32位大写MD5字符串');
console.log('2. 空值（null, undefined, 空字符串）和 sign 字段不参与签名');
console.log('3. 参数按ASCII码排序');
console.log('4. 最后拼接 &key=密钥');


