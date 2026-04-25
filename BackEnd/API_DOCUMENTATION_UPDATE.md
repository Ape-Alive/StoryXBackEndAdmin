# API 文档更新总结

## 更新概述

已完善所有新创建的用户端AI调用接口的Swagger文档，包括详细的请求参数、响应示例、错误处理和curl使用示例。

**补充**：`POST /api/voice-profiles/clone`（音色克隆）的字段说明、Key 规则、curl 与 Swagger 示例见下文 **§9**；可选参数包括 `userApiKeyId`（自动择优）、`name`（展示名）、`sampleUrl`（示例/试听链接）等。

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
- ✅ 新增 `logType` 字段与筛选参数：支持 `model_call`（模型调用）与 `voice_clone`（声音复刻）
- ✅ 将声音复刻流水（`voice_clone_credit_logs`）并入用户日志接口，按 `requestTime` 统一倒序分页返回
- ✅ Swagger 示例新增声音复刻样例（含 `cloneStatus`、`voiceId`、`voiceProfileId`、`userApiKeyId`）

**响应字段说明**:
- 日志基本信息（id, requestId）
- 日志类型（logType, logTypeLabel）
- 用户和模型信息
- Token使用情况（input/output/total）
- 费用信息（cost）
- 调用状态和错误信息
- 时间信息（requestTime, responseTime, duration）
- 设备信息（deviceFingerprint）
- 声音复刻扩展字段（仅 `logType=voice_clone`）：`cloneStatus`、`voiceId`、`voiceProfileId`、`userApiKeyId`

**使用示例场景**:
- 获取所有日志
- 仅声音复刻日志（`logType=voice_clone`）
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
- ✅ 支持声音复刻详情：`requestId` 可传 `voice_clone:{id}`
- ✅ 返回结构补充日志类型字段：`logType`、`logTypeLabel`

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

### 9. POST /api/voice-profiles/clone
**音色克隆（复刻声音并落库）**

**文档更新要点（与实现对齐）**

- ✅ 可选 **`name`**：本地展示名，写入 `VoiceProfile.name`；空串或未传存 `null`，服务端 `trim`。
- ✅ 可选 **`sampleUrl`**：音色示例/试听链接，写入 `VoiceProfile.sampleUrl`；空串或未传存 `null`，服务端 `trim`（可与复刻用 `audioUrl` 不同）。
- ✅ 可选 **`avatarUrl` / `description` / `tags`**：分别写入 `VoiceProfile.avatarUrl`、`VoiceProfile.description`、`VoiceProfile.tags`；其中 `tags` 建议使用结构化标签（`age` / `gender` / `trait`）。
- ✅ 可选 **`userApiKeyId`**：不传则由后端按规则自动选择 `user_api_keys` 记录。
- ✅ 终端用户可使用 **本人 Key** 或 **系统级 Key**；自动选择时 **优先本人 Key**，同档按授权绑定数、剩余积分择优。
- ✅ 管理员克隆为 **系统音色**；自动选择仅 **系统级 Key** 池。
- ✅ **积分扣费（仅 `user` / `basic_user`）**：`voiceCloneCreditsPerCall`（默认 0）> 0 时从本次 **`UserApiKey`** 增加 `usedCredits`；流水 **`status`=`charged`**。单价为 0 时 **`status`=`no_charge_configured`**。**`super_admin` / `platform_admin` 克隆不扣费、不校验余额**，仍写 **`status`=`admin_exempt`**。终端用户额度不足返回 **400**。

**认证**：`Authorization: Bearer <JWT>`

**角色**：`super_admin` / `platform_admin` / `user` / `basic_user`

**请求体（JSON）**

| 字段 | 必填 | 说明 |
|------|------|------|
| `providerId` | 是 | 提供商 ID，须与绑定模型所属提供商一致 |
| `apiPath` | 是 | 复刻 API 路径，须出现在该提供商 `voiceCloneApis` 白名单中 |
| `userApiKeyId` | 否 | 表 `user_api_keys.id`。不传或 `null` 时由后端自动选择一条可用 Key |
| `prefix` | 是 | 上游要求的音色前缀，**仅英文字母与数字** |
| `audioUrl` | 是 | 调用上游「复刻」接口使用的**必选**样本音频 URL（公网可访问） |
| `modelId` | 是 | 绑定模型 ID；克隆后 `isModelLocked=true`，不可改绑其它模型 |
| `name` | 否 | 本地展示用音色名称（`VoiceProfile.name`）；不传或空字符串则为 `null`；服务端会 `trim` |
| `sampleUrl` | 否 | 音色**示例/试听**链接（`VoiceProfile.sampleUrl`），可与 `audioUrl` 相同或不同（例如对外 CDN 试听地址）；不传或空字符串则为 `null`；服务端会 `trim` |
| `avatarUrl` | 否 | 音色头像链接（`VoiceProfile.avatarUrl`）；不传或空字符串则为 `null`；服务端会 `trim` |
| `description` | 否 | 音色描述（`VoiceProfile.description`）；不传或空字符串则为 `null`；服务端会 `trim` |
| `tags` | 否 | 音色特征标签数组（`VoiceProfile.tags`）。建议包含：`age`（如 `18-25`）、`gender`（`male/female`）、`trait`（特征词，至少 1 个，可多个） |

**`audioUrl` 与 `sampleUrl`**

- **`audioUrl`**：参与提供商复刻流程，由上游拉取并生成 `voice_id`。
- **`sampleUrl`**：仅写入本地音色记录，供列表/详情展示或客户端试听；不参与上游复刻请求。

**`tags` 推荐格式**

```json
[
  { "type": "age", "value": "18-25" },
  { "type": "gender", "value": "female" },
  { "type": "trait", "value": "温柔" },
  { "type": "trait", "value": "亲和" }
]
```

**落库结果**

- **终端用户**：`VoiceProfile.scope = user`，`userId = 当前登录用户`
- **管理员**：`scope = system`（系统音色）

**API Key 规则**

- **终端用户**
  - 显式传 `userApiKeyId`：仅允许 **本人 Key**（`UserApiKey.userId` = 当前用户）或 **系统级 Key**（`userId` 为空）；禁止使用他人名下 Key。
  - 不传 `userApiKeyId`：在同 `providerId`、未过期、`status=active` 的 **本人 Key ∪ 系统级 Key** 中自动选择；**整档优先本人 Key**，同档内按 **`Authorization` 绑定条数升序** → **剩余积分 `credits - usedCredits` 降序** → `id` 字典序。
- **管理员**
  - 自动选择：仅从 **系统级 Key**（`userId` 为空）池中按上条「绑定数 / 剩余积分 / id」择优。
  - 显式传入：可使用任意与 `providerId` 匹配且可用的 Key。

**成功响应**：HTTP `201`，`data` 为音色对象（结构与列表项 `VoiceProfileListItem` 一致，含 `models` 等关联）。若请求中传入了 `name` / `sampleUrl`，响应中对应字段与落库一致（空则多为 `null`）。

**常见错误**

| HTTP | 场景 |
|------|------|
| 400 | 缺必填字段、`prefix` 格式非法、`name` / `sampleUrl` 类型非法（须为 string 或 null）、`apiPath` 不在白名单、Key 已过期、**API Key 剩余积分不足复刻扣费**（`Insufficient API key credits for voice clone`）、上游复刻失败、自动选择时无可选 Key |
| 401 | 未登录或 Token 无效 |
| 403 | 终端用户使用了非本人且非系统级的 Key |
| 404 | 提供商、模型或显式指定的 Key 不存在 |
| 409 | 上游返回的 `voice_id` 在本地已存在 |

**curl 示例 A（终端用户：不传 `userApiKeyId`，传可选字段与结构化 `tags`）**

```bash
curl -sS -X POST "${BASE_URL}/api/voice-profiles/clone" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "<provider_cuid>",
    "apiPath": "/v1/audio/voices",
    "prefix": "myvoice01",
    "audioUrl": "https://cdn.example.com/sample.mp3",
    "modelId": "<model_cuid>",
    "name": "我的复刻音色",
    "sampleUrl": "https://cdn.example.com/preview/myvoice01.mp3",
    "avatarUrl": "https://cdn.example.com/avatar/myvoice01.png",
    "description": "清晰温柔，适合客服播报",
    "tags": [
      { "type": "age", "value": "18-25" },
      { "type": "gender", "value": "female" },
      { "type": "trait", "value": "温柔" },
      { "type": "trait", "value": "亲和" }
    ]
  }'
```

**curl 示例 B（仅必填字段，不传 `name`、不传 `userApiKeyId`）**

```bash
curl -sS -X POST "${BASE_URL}/api/voice-profiles/clone" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "<provider_cuid>",
    "apiPath": "/v1/audio/voices",
    "prefix": "myvoice01",
    "audioUrl": "https://cdn.example.com/sample.mp3",
    "modelId": "<model_cuid>"
  }'
```

**Swagger**：启动服务后见 `/api-docs` 中「语音管理-音色」→ `POST /api/voice-profiles/clone`（含请求 `examples`、可选 `name` / `sampleUrl`、`400` 示例含字段校验失败）。

---

### 10. /api/voice-profiles/{id}（详情 / 更新 / 删除）

**覆盖接口**：
- `GET /api/voice-profiles/{id}`：获取音色详情
- `PUT /api/voice-profiles/{id}`：更新音色
- `DELETE /api/voice-profiles/{id}`：删除音色

**权限规则（与实现一致）**：
- 管理员（`super_admin` / `platform_admin`）：可操作任意音色。
- 终端用户（`user` / `basic_user`）：
  - `GET`：可查看系统音色（`scope=system`）和本人音色（`scope=user` 且 `userId=当前用户`）
  - `PUT` / `DELETE`：仅可操作本人音色（`scope=user` 且 `userId=当前用户`）

**PUT 关键约束**：
- `scope` 不可修改（否则 400）。
- `userId` 不可修改（否则 400）。
- `voiceId` 若改为已存在值会返回 409。
- `modelIds` 若传入则整体替换绑定；若音色 `isModelLocked=true` 则不允许改绑（400）。
- `tags` 若传入需满足结构化约束：必须包含
  - `age`（年龄段）
  - `gender`（`male` / `female`）
  - 至少 1 个 `trait`（特征词）

**DELETE 关键说明**：
- 删除克隆音色时，若 `meta` 携带上游删除所需信息，服务端会先尝试调用上游 `delete_voice`，成功后再删除本地记录。

**常见错误码**：
- `400`：参数非法、禁止字段更新、模型绑定已锁定、远程删除失败等
- `403`：越权访问/更新/删除
- `404`：音色不存在
- `409`：`voiceId` 冲突（PUT）

**Swagger**：`/api-docs` → 「语音管理-音色」→ `/api/voice-profiles/{id}`（已补充 `GET/PUT/DELETE` 的详情描述、请求示例与错误场景）。

---

### 11. AIProvider.voiceCloneCreditsPerCall（复刻单次积分）

- **含义**：终端用户（`user` / `basic_user`）按单价从 `UserApiKey` 累加 `usedCredits`；**`0` 不扣费**（`status=no_charge_configured`）。**`super_admin` / `platform_admin` 不扣费**（`status=admin_exempt`，`amountCharged=0`）。
- **配置**：管理后台「提供商」表单字段 **复刻单次积分**；接口为创建/更新提供商时的 body 字段 `voiceCloneCreditsPerCall`（非负小数，可选）。
- **流水表**：`voice_clone_credit_logs`（`amountCharged`、`usedCreditsBefore` / `usedCreditsAfter`、`userApiKeyId`、`providerId`、`voiceProfileId`、`voiceId`、`actorUserId`、`status`、`meta`）。

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

2026-04-25（§9 克隆：`audioUrl`/`sampleUrl`、`name`、`userApiKeyId`、`tags` 结构化；§10 `/api/voice-profiles/{id}`：GET/PUT/DELETE 权限、约束与错误场景补全；§11 单次复刻扣费与流水；Swagger 已对齐）
