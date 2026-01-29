# YunGouOS 支付回调处理说明

## 一、回调地址要求

根据 YunGouOS 文档，回调地址（`notify_url`）必须满足以下要求：

1. **必须公网可访问**：YunGouOS 服务器需要能够访问你的服务器
2. **仅支持 http/https 协议**：不支持其他协议
3. **不可包含端口**：必须使用标准端口（80 或 443）
4. **不能包含参数**：URL 中不能有查询参数，例如：
   - ✅ 正确：`https://api.yourdomain.com/api/payment/callback/yungouos`
   - ❌ 错误：`https://api.yourdomain.com:5800/api/payment/callback/yungouos?token=xxx`
5. **只能是已备案的域名**：生产环境必须使用已备案的域名

### 开发环境

本地开发时，可以使用内网穿透工具（如 ngrok）来满足公网访问要求：

```bash
# 安装 ngrok
brew install ngrok  # macOS
# 或从 https://ngrok.com/ 下载

# 启动内网穿透
ngrok http 5800

# 会得到一个公网地址，例如：
# https://abc123.ngrok.io -> http://localhost:5800

# 配置环境变量
YUNGOUOS_NOTIFY_URL=https://abc123.ngrok.io/api/payment/callback/yungouos
```

**注意**：ngrok 免费版每次启动地址会变化，需要重新配置。

## 二、回调参数说明

YunGouOS 回调时会发送以下参数（POST 请求）：

| 参数名 | 类型 | 是否参与签名 | 描述 |
|--------|------|------------|------|
| code | String | 是 | 支付结果（1=成功，0=失败） |
| orderNo | String | 是 | YunGouOS 系统内单号 |
| outTradeNo | String | 是 | 商户订单号（我们创建订单时传入的订单号） |
| payNo | String | 是 | 支付单号（第三方支付单号） |
| money | String | 是 | 支付金额（单位：元） |
| mchId | String | 是 | 支付商户号 |
| payChannel | String | 否 | 支付渠道（wxpay、alipay） |
| time | String | 否 | 支付成功时间（格式：yyyy-MM-dd HH:mm:ss） |
| attach | String | 否 | 附加数据，回调时原路返回 |
| openId | String | 否 | 用户 openId |
| payBank | String | 否 | 用户付款渠道（例如：农业银行（借记卡）） |
| sign | String | 否 | 数据签名（不参与签名计算） |

## 三、返回结果

**必须返回大写的 `SUCCESS` 字符串**（区分大小写）

- ✅ 正确：`SUCCESS`
- ❌ 错误：`success`、`Success`、`SUCCESS\n` 等

返回 `SUCCESS` 后，YunGouOS 将不再重复回调。

## 四、安全注意事项

### 1. 签名验证（必须）

**必须验证签名**，防止数据泄漏导致"假通知"，造成资金损失。

#### 签名算法（微信官方签名算法）

YunGouOS 使用与微信官方一致的签名算法：

1. **过滤参数**：将集合M内非空参数值的参数过滤出来（排除 `null`、`undefined`、空字符串和 `sign` 字段）
2. **排序**：按照参数名ASCII码从小到大排序（字典序）
3. **拼接**：使用URL键值对格式（`key1=value1&key2=value2...`）拼接成字符串 `stringA`
4. **加密钥**：在 `stringA` 最后拼接上 `&key=密钥` 得到 `stringSignTemp`
5. **MD5加密**：对 `stringSignTemp` 进行MD5运算，再将得到的字符串所有字符转换为大写，得到 `sign` 值

```javascript
// 代码中已实现签名验证
const isValid = await provider.verifyCallback(callbackData, sign);
if (!isValid) {
  throw new BadRequestError('Invalid callback signature');
}
```

#### 签名算法示例

```javascript
// 参数
const params = {
  out_trade_no: 'ORDER123',
  total_fee: '99.00',
  mch_id: '1234567890',
  body: '套餐购买',
  type: '2'
};

// 1. 过滤并排序：body=套餐购买&mch_id=1234567890&out_trade_no=ORDER123&total_fee=99.00&type=2
// 2. 拼接密钥：...&key=your_api_key
// 3. MD5并转大写：ABCD1234EFGH5678IJKL9012MNOP3456
```

### 2. 金额校验（必须）

**必须校验回调金额与订单金额一致**，防止"假通知"。

```javascript
// 代码中已实现金额校验
const callbackAmount = parseFloat(amount);
const orderAmount = parseFloat(order.finalAmount);
if (Math.abs(callbackAmount - orderAmount) > 0.01) {
  throw new BadRequestError('Payment amount mismatch');
}
```

### 3. 幂等性处理（必须）

同样的通知可能会多次发送，必须能够正确处理重复的通知。

```javascript
// 代码中已实现幂等性检查
if (payment.status === 'success') {
  return { success: true, message: 'Payment already processed' };
}
```

### 4. 并发控制（必须）

在对业务数据进行状态检查和处理之前，要采用数据锁进行并发控制，以避免函数重入造成的数据混乱。

```javascript
// 代码中使用数据库事务提供并发控制
return await prisma.$transaction(async (tx) => {
  // 在事务中重新查询并检查状态
  const lockedPayment = await tx.payment.findUnique({
    where: { id: payment.id }
  });
  // ...
});
```

## 五、回调重试机制

如果 YunGouOS 没有收到 `SUCCESS` 响应，会按照以下频率重试：

```
15s / 15s / 30s / 3m / 10m / 20m / 30m / 30m / 30m / 60m / 3h / 3h / 3h / 6h / 6h
总计：24小时4分钟，共15次
```

因此，回调处理必须：
1. **快速响应**：尽快处理并返回 `SUCCESS`
2. **幂等性**：能够正确处理重复通知
3. **错误处理**：即使处理失败也要返回 `FAIL`（不要返回错误页面）

## 六、代码实现要点

### 1. 回调数据解析

```javascript
// BackEnd/src/services/payment/providers/yungouos.provider.js
parseCallback(callbackData) {
  const isSuccess = callbackData.code === '1' || callbackData.code === 1;
  return {
    orderNo: callbackData.outTradeNo, // 商户订单号
    thirdPartyNo: callbackData.payNo || callbackData.orderNo,
    status: isSuccess ? 'success' : 'failed',
    amount: callbackData.money, // 支付金额
    paidAt: parseYunGouOSTime(callbackData.time), // 支付时间
    rawData: callbackData
  };
}
```

### 2. 返回响应

```javascript
// BackEnd/src/controllers/payment.controller.js
if (platform === 'yungouos') {
  // 必须返回大写的 SUCCESS
  return res.send(result.success ? 'SUCCESS' : 'FAIL');
}
```

### 3. 错误处理

```javascript
catch (error) {
  // 即使处理失败，也要返回 FAIL
  if (platform === 'yungouos') {
    logger.error('Payment callback processing failed', { error, callbackData });
    return res.send('FAIL');
  }
}
```

## 七、测试建议

### 1. 本地测试

使用 ngrok 等内网穿透工具，将本地服务暴露到公网：

```bash
ngrok http 5800
# 使用返回的地址配置 YUNGOUOS_NOTIFY_URL
```

### 2. 模拟回调测试

可以手动发送 POST 请求模拟回调（注意需要正确的签名）：

```bash
curl -X POST http://localhost:5800/api/payment/callback/yungouos \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1",
    "orderNo": "YUNGOUS_ORDER_NO",
    "outTradeNo": "ORDER1234567890123",
    "payNo": "WX_PAY_NO",
    "money": "99.00",
    "mchId": "your_mch_id",
    "sign": "CALCULATED_SIGN"
  }'
```

### 3. 生产环境检查清单

- [ ] 回调地址使用 HTTPS
- [ ] 回调地址不包含端口号
- [ ] 回调地址不包含参数
- [ ] 回调地址使用已备案域名
- [ ] 签名验证已启用
- [ ] 金额校验已启用
- [ ] 幂等性处理已实现
- [ ] 并发控制已实现
- [ ] 返回 `SUCCESS`（大写）
- [ ] 错误日志记录完善

## 八、常见问题

### 1. 回调一直失败

- 检查回调地址是否公网可访问
- 检查是否返回了正确的 `SUCCESS`（大写）
- 检查服务器日志，查看具体错误
- 确认签名验证和金额校验是否通过

### 2. 回调重复处理

- 检查幂等性处理逻辑
- 确认数据库事务是否正确
- 检查并发控制是否生效

### 3. 签名验证失败

- 检查 `YUNGOUOS_API_KEY` 是否正确
- 确认签名算法与文档一致
- 检查回调数据是否完整

