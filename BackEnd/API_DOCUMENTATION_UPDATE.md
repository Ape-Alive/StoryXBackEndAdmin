# API 文档更新总结

## 更新概述

已完善所有新创建的用户端AI调用接口的Swagger文档，包括详细的请求参数、响应示例、错误处理和curl使用示例。

## 更新的接口

### 1. POST /api/user/authorization/request
**申请调用授权**

**更新内容**:
- ✅ 添加了详细的流程说明（5步流程）
- ✅ 新增可选参数 `userApiKeyId`：指定返回某个用户API Key（`UserApiKey.id`），用于客户端强制选择某把 Key
- ✅ 补充了设备指纹验证说明
- ✅ 添加了完整的响应示例
- ✅ 添加了详细的错误响应示例（400/401/403/404）
- ✅ 添加了curl使用示例
- ✅ 补充了注意事项说明

**新增错误示例**:
- 参数验证错误
- 额度不足
- 设备指纹格式错误
- 设备被禁用
- 用户状态异常
- 套餐权限不足
- 设备数量超限
- 模型/服务提供商不可用

---

### 2. GET /api/user/authorization/my-authorizations
**获取我的授权列表**

**更新内容**:
- ✅ 添加了完整的响应数据结构说明
- ✅ 添加了分页信息说明
- ✅ 添加了多个curl使用示例（不同筛选场景）
- ✅ 补充了错误响应示例（400/401/403）

**响应字段说明**:
- 授权基本信息（id, userId, modelId）
- 关联的模型和提供商信息
- 设备指纹、预冻结额度
- 授权状态和过期时间
- 请求ID（如果已使用）
- 创建和更新时间

---

### 3. POST /api/user/authorization/{id}/cancel
**取消授权**

**更新内容**:
- ✅ 添加了完整的响应示例
- ✅ 添加了详细的错误响应示例
- ✅ 添加了curl使用示例
- ✅ 补充了注意事项（立即生效、无法恢复）

**错误示例**:
- 参数错误
- 授权不是活跃状态
- 无权操作该授权
- 授权不存在

---

### 4. POST /api/user/ai/call/report
**上报调用结果**

**更新内容**:
- ✅ 添加了详细的流程说明（5步流程）
- ✅ 补充了Token说明、字符计费说明（usedChars 单字段）和状态说明
- ✅ 添加了完整的响应示例（包含结算详情）
- ✅ 添加了详细的错误响应示例
- ✅ 添加了成功和失败两种场景的curl示例

**字段更新（字符计费）**:
- ✅ 新增 `usedChars`：字符计费（pricingType=char）时推荐只上报一个字段即可
- ✅ `inputChars` / `outputChars` / `totalChars`：标记为旧字段，继续兼容，但推荐迁移到 `usedChars`

**响应字段说明**:
- requestId：请求ID
- actualCost：实际费用
- frozenQuota：预冻结额度
- refundedQuota：退回的额度
- additionalCost：补充扣减的额度
- remainingQuota：剩余可用额度

**错误示例**:
- 参数验证错误
- 授权已过期
- requestId重复
- 授权已使用
- 额度不足（补充扣减时）

---

### 5. GET /api/user/ai/logs
**获取调用日志列表**

**更新内容**:
- ✅ 添加了完整的响应数据结构说明
- ✅ 添加了分页信息说明
- ✅ 添加了多个curl使用示例（不同筛选场景）
- ✅ 补充了错误响应示例

**响应字段说明**:
- 日志基本信息（id, requestId）
- 用户和模型信息
- Token使用情况（input/output/total）
- 费用信息（cost）
- 调用状态和错误信息
- 时间信息（requestTime, responseTime, duration）
- 设备信息（deviceFingerprint）

**使用示例场景**:
- 获取所有日志
- 按状态筛选
- 按时间范围筛选
- 组合筛选（模型+状态+分页）

---

### 6. GET /api/user/ai/logs/{requestId}
**获取调用日志详情**

**更新内容**:
- ✅ 添加了完整的响应数据结构说明
- ✅ 添加了详细的错误响应示例（403/404）
- ✅ 添加了curl使用示例
- ✅ 补充了注意事项说明

**响应字段**:
- 与列表接口相同，但包含更完整的信息
- 包含IP地址等详细信息

---

### 7. VoiceProfile.tags（音色标签）
**新增字段**：`VoiceProfile.tags`（JSON 数组）

**影响接口**：
- ✅ `POST /api/voice-profiles`：创建音色时新增 `tags`
- ✅ `PUT /api/voice-profiles/{id}`：更新音色时支持更新 `tags`

**约束（后端强制）**：
- `tags` 必须至少包含 3 类标签：
  - `age`：年龄范围（例如 `18-25`）
  - `gender`：性别（`male` 或 `female`）
  - `trait`：特征词（性格、外貌等，至少 1 个，可多个）

---

### 8. AIModel.supportsVoiceCommand（TTS 模型语音指令）
**新增字段**：`AIModel.supportsVoiceCommand`（布尔，默认 `false`）

**影响接口**：
- ✅ `POST /api/models`：创建模型时可传 `supportsVoiceCommand`（仅 `type=tts` 时落库为 true，其它类型强制为 false）
- ✅ `PUT /api/models/{id}`：更新时可修改；`type` 改为非 TTS 时自动置为 `false`

**联动行为**：
- 当模型为 **TTS** 且 `supportsVoiceCommand=true` 时，后端会将 **已绑定该模型的所有音色** 的 `VoiceProfile.supportsVoiceCommand` 批量更新为 `true`
- 当 TTS 模型该字段为 `false`，或非 TTS 模型时，会将绑定音色的 `supportsVoiceCommand` 批量更新为 `false`（与模型开关保持一致）

---

## 文档改进点

### 1. 响应示例完整性
- ✅ 所有接口都添加了完整的响应数据结构
- ✅ 使用 `allOf` 引用公共schema（Success/Pagination）
- ✅ 所有字段都有类型、示例和描述

### 2. 错误处理文档
- ✅ 所有接口都添加了详细的错误响应示例
- ✅ 使用 `examples` 展示不同错误场景
- ✅ 包含400/401/403/404等常见HTTP状态码

### 3. 使用示例
- ✅ 所有接口都添加了curl使用示例
- ✅ 展示了不同使用场景（筛选、分页等）
- ✅ 包含成功和失败两种场景的示例

### 4. 参数说明
- ✅ 所有参数都有详细的描述
- ✅ 包含默认值、取值范围、格式要求
- ✅ 说明了参数的可选性和用途

### 5. 流程说明
- ✅ 关键接口添加了详细的流程说明
- ✅ 说明了业务逻辑和注意事项
- ✅ 补充了状态说明和字段说明

---

## 文档结构

每个接口文档包含以下部分：

1. **summary**: 接口简要说明
2. **description**: 详细描述
   - 流程说明
   - 字段说明
   - 注意事项
   - 使用示例（curl）
3. **tags**: 接口分类标签
4. **security**: 认证要求
5. **parameters/requestBody**: 请求参数
   - 类型、格式、示例
   - 必填/可选说明
   - 取值范围和验证规则
6. **responses**: 响应说明
   - 成功响应（200）
     - 完整的数据结构
     - 字段说明和示例
   - 错误响应（400/401/403/404）
     - 错误场景示例
     - 错误消息说明

---

## 查看文档

启动服务后，可以通过以下方式查看API文档：

1. **Swagger UI**: http://localhost:5800/api-docs
2. **OpenAPI JSON**: http://localhost:5800/api-docs.json

---

## 后续建议

1. **添加更多示例**: 可以考虑添加更多实际使用场景的示例
2. **添加流程图**: 对于复杂的业务流程，可以添加Mermaid流程图
3. **添加测试用例**: 可以为每个接口添加测试用例说明
4. **版本管理**: 如果API有版本变更，需要添加版本说明

---

## 更新日期

2024-01-01
