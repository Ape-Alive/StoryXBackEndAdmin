# 微信扫码支付接口使用文档（YunGouOS）

**接口名称**：微信扫码支付（Native 支付）
**服务提供方**：YunGouOS
**适用场景**：PC 网站、桌面端应用、线下自助设备等扫码支付场景
**适用对象**：普通商户 / 渠道商户 / 商户自有系统
**最近更新时间**：2024-08-12

---

## 一、接口概述

本接口用于创建微信扫码支付订单（Native 支付模式），接口支持返回 **微信原生支付链接** 或 **已生成的二维码图片地址**。

用户使用 **微信扫一扫** 扫描二维码完成支付，支付结果通过异步回调通知商户系统。

---

## 二、接口地址

POST https://api.pay.yungouos.com/api/pay/wxpay/nativePay

yaml
复制代码

---

## 三、请求参数

### 1. 必填参数

| 参数名 | 类型 | 是否必填 | 说明 |
|------|------|---------|------|
| out_trade_no | String | 是 | 商户订单号（全局唯一，不可重复） |
| total_fee | String | 是 | 支付金额，单位：元（0.01 ~ 999999） |
| mch_id | String | 是 | 微信支付商户号（YunGouOS 后台获取） |
| body | String | 是 | 商品或服务描述 |
| sign | String | 是 | 数据签名（按签名算法生成） |

---

### 2. 常用可选参数

| 参数名 | 类型 | 是否必填 | 说明 |
|------|------|---------|------|
| type | String | 否 | 返回类型：<br>1 = 微信原生支付链接（默认）<br>2 = 二维码图片地址 |
| app_id | String | 否 | YunGouOS 报备的 app_id，多场景商户必传 |
| attach | String | 否 | 附加数据，回调时原样返回 |
| notify_url | String | 否 | 支付成功后的异步回调地址 |
| return_url | String | 否 | 同步跳转地址（仅收银台模式有效） |
| credit | String | 否 | 是否允许信用卡支付：0 不允许 / 1 允许（默认） |
| device_info | String | 否 | 设备或门店信息，用于对账 |
| end_time | String | 否 | 订单有效截止时间，格式：yyyy-MM-dd HH:mm:ss |

---

### 3. 分账相关参数（可选）

| 参数名 | 类型 | 是否必填 | 说明 |
|------|------|---------|------|
| auto | String | 否 | 分账模式：<br>0 不分账（默认）<br>1 自动分账<br>2 手动分账 |
| auto_node | String | 否 | 自动分账触发节点：pay / callback |
| config_no | String | 否 | 分账配置单号，多个用英文逗号分隔 |

---

### 4. 单品优惠 / 商品明细参数（可选）

> 适用于微信单品优惠场景，需以 **JSON 字符串** 形式传递

```json
{
  "cost_price": "100",
  "goods_detail": [
    {
      "goods_id": "SKU_001",
      "goods_name": "商品名称",
      "price": "50",
      "quantity": "2",
      "wxpay_goods_id": "WX_GOODS_001"
    }
  ]
}
字段名	类型	是否必填	说明
cost_price	String	否	订单原价（元）
goods_detail	Array	否	商品明细列表
goods_id	String	否	商品编码（SKU）
goods_name	String	否	商品名称
price	String	否	商品单价（元）
quantity	String	否	商品购买数量
wxpay_goods_id	String	否	微信侧商品编码

四、请求示例
示例：返回二维码图片地址（type = 2）
json
复制代码
{
  "out_trade_no": "ORDER_202408120001",
  "total_fee": "99.00",
  "mch_id": "1234567890",
  "body": "会员套餐购买",
  "type": "2",
  "notify_url": "https://example.com/pay/notify",
  "attach": "userId=10001",
  "sign": "xxxxxxxxxxxxxxxxxxxxxxxx"
}
五、返回结果
1. 返回参数说明
参数名	类型	是否必填	说明
code	Int	是	状态码：0 成功 / 1 失败
data	String	是	支付数据（二维码地址或微信支付链接）
msg	String	是	返回消息

2. 返回示例
json
复制代码
{
  "code": 0,
  "msg": "微信下单成功，请扫码支付",
  "data": "http://images.yungouos.com/wxpay/native/code/1556529600703.png"
}
六、支付流程说明
text
复制代码
商户系统创建订单
        ↓
调用微信扫码支付接口
        ↓
返回二维码地址 / 微信支付链接
        ↓
前端展示二维码
        ↓
用户使用微信扫码支付
        ↓
微信支付完成
        ↓
YunGouOS 异步回调 notify_url
        ↓
商户系统校验并更新订单状态
七、关键注意事项
out_trade_no 必须保证全局唯一

支付金额单位为 元，必须使用字符串类型

支付是否成功必须以 异步回调 notify_url 为准

前端二维码展示成功不代表支付完成

回调处理需做好 签名校验、防重复通知、幂等处理
