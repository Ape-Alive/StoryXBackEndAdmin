const express = require('express')
const router = express.Router()
const voiceProfileController = require('../controllers/voiceProfile.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const {
  getVoiceProfilesValidator,
  getVoiceProfileDetailValidator,
  createVoiceProfileValidator,
  updateVoiceProfileValidator,
  deleteVoiceProfileValidator,
  cloneVoiceProfileValidator,
} = require('../validators/voiceProfile.validator')
const { ROLES } = require('../constants/roles')

router.use(authenticate)

/**
 * @swagger
 * /api/voice-profiles:
 *   get:
 *     summary: 获取音色列表 [管理员/终端用户]
 *     description: |
 *       获取音色（VoiceProfile）列表，支持分页和筛选。
 *
 *       **权限说明**：
 *       - 管理员：可查看所有音色
 *       - 终端用户：仅可查看 system 音色 + 自己的 user 音色
 *
 *       **includeAll 参数说明**：
 *       - includeAll=true（管理员）：强制查询全部音色（忽略 scope/userId 过滤）
 *       - includeAll=true（终端用户）：**一次性返回**当前用户可见的全部音色（`system` + 自己的 `user`），
 *         不分页；仍支持 voiceId/name/modelId/isActive 等筛选；`scope`/`userId` 查询参数会被忽略
 *       - includeAll=false（默认）：终端用户不传 scope 时按 page/pageSize 分页返回 system + 自己的 user
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: voiceId
 *         schema:
 *           type: string
 *         description: 音色ID（模糊搜索）
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 名称（模糊搜索）
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [system, user]
 *         description: 范围（system/user）
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           nullable: true
 *         description: |
 *           用户ID筛选（管理员可用）。
 *           传 `null` 表示 system 音色。
 *       - in: query
 *         name: modelId
 *         schema:
 *           type: string
 *         description: 关联模型ID筛选（筛出绑定该模型的音色）
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用
 *       - in: query
 *         name: includeAll
 *         schema:
 *           type: boolean
 *           default: false
 *         description: |
 *           全量开关。
 *           - 管理员：为 true 时忽略 scope/userId，查库全量。
 *           - 终端用户：为 true 时一次性返回全部「system + 自己的 user」（响应里通常 page=1、pageSize=total）。
 *     responses:
 *       200:
 *         description: |
 *           获取成功。响应体由 `ResponseHandler.paginated` 统一输出：
 *           - `success` / `message`
 *           - `data`：`VoiceProfile[]`（列表查询含 `user`、`models.model.provider` 等嵌套）
 *           - `pagination`：`{ page, pageSize, total, totalPages }`（与顶层并列，**不在** `data` 内）
 *           终端用户 `includeAll=true` 时通常 `page=1` 且 `pageSize=total`（一次性返回全部可见音色）。
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoiceProfilesListResponse'
 *             examples:
 *               pagedDefault:
 *                 summary: 默认分页（含一条示例）
 *                 value:
 *                   success: true
 *                   message: Success
 *                   data:
 *                     - id: ca48fc89-10a3-4acd-8136-fbd19069321e
 *                       voiceId: cosyvoice-v3-flash-system-demo01
 *                       scope: system
 *                       userId: null
 *                       sampleUrl: https://files.example.com/demo.mp3
 *                       name: 青春女声
 *                       description: 示例
 *                       meta: null
 *                       isModelLocked: false
 *                       isActive: true
 *                       createdAt: '2026-04-22T02:00:00.000Z'
 *                       updatedAt: '2026-04-22T02:00:00.000Z'
 *                       user: null
 *                       models:
 *                         - voiceProfileId: ca48fc89-10a3-4acd-8136-fbd19069321e
 *                           modelId: model-demo-001
 *                           createdAt: '2026-04-22T02:00:00.000Z'
 *                           model:
 *                             id: model-demo-001
 *                             name: cosyvoice-v3-flash
 *                             displayName: CosyVoice V3 Flash
 *                             provider:
 *                               id: prov-demo
 *                               name: aliyun
 *                               displayName: 阿里云百练
 *                   pagination:
 *                     page: 1
 *                     pageSize: 20
 *                     total: 128
 *                     totalPages: 7
 *               endUserIncludeAll:
 *                 summary: 终端用户 includeAll=true（一次返回全部可见）
 *                 value:
 *                   success: true
 *                   message: Success
 *                   data:
 *                     - id: aaaabbbb-cccc-dddd-eeee-ffffffffffff
 *                       voiceId: my-clone-voice-001
 *                       scope: user
 *                       userId: user-demo-001
 *                       name: 我的克隆音
 *                       isModelLocked: true
 *                       isActive: true
 *                       createdAt: '2026-04-22T03:00:00.000Z'
 *                       updatedAt: '2026-04-22T03:00:00.000Z'
 *                       user:
 *                         id: user-demo-001
 *                         email: user@example.com
 *                         phone: null
 *                       models: []
 *                   pagination:
 *                     page: 1
 *                     pageSize: 1
 *                     total: 1
 *                     totalPages: 1
 */
router.get('/', getVoiceProfilesValidator, validate, voiceProfileController.getVoiceProfiles.bind(voiceProfileController))

/**
 * @swagger
 * /api/voice-profiles/{id}:
 *   get:
 *     summary: 获取音色详情 [管理员/终端用户]
 *     description: |
 *       按音色记录 `id` 返回详情（含 `user`、`models.model.provider`）。
 *
 *       **权限说明**
 *       - 管理员（`super_admin` / `platform_admin`）：可查看任意音色。
 *       - 终端用户（`user` / `basic_user`）：仅可查看 `scope=system` 的公共音色，或本人 `scope=user` 音色。
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 音色记录ID（UUID）
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VoiceProfileListItem'
 *             example:
 *               success: true
 *               message: ok
 *               data:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 voiceId: voice_abc123
 *                 scope: user
 *                 userId: usrxxxxxxxxxxxxxxxxxx
 *                 name: 我的复刻音色
 *                 sampleUrl: https://cdn.example.com/preview/myvoice01.mp3
 *                 avatarUrl: https://cdn.example.com/avatar/myvoice01.png
 *                 description: 清晰温柔，适合客服播报
 *                 tags:
 *                   - type: age
 *                     value: 18-25
 *                   - type: gender
 *                     value: female
 *                   - type: trait
 *                     value: 温柔
 *                 isModelLocked: true
 *                 isActive: true
 *                 models: []
 *       403:
 *         description: 无权查看该音色
 *       404:
 *         description: 音色不存在
 */
router.get(
  '/:id',
  getVoiceProfileDetailValidator,
  validate,
  voiceProfileController.getVoiceProfileDetail.bind(voiceProfileController)
)

/**
 * @swagger
 * /api/voice-profiles:
 *   post:
 *     summary: 创建音色 [管理员/终端用户]
 *     description: |
 *       创建音色记录。
 *
 *       **说明**：
 *       - `voiceId` 全局唯一
 *       - `scope=system` 仅管理员可创建
 *       - `scope=user` 将强制绑定当前用户（后端忽略/禁止传 userId）
 *       - `modelIds` 支持绑定多个模型；不传或空数组表示公共音色
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [voiceId]
 *             properties:
 *               voiceId:
 *                 type: string
 *               name:
 *                 type: string
 *                 nullable: true
 *               scope:
 *                 type: string
 *                 enum: [system, user]
 *                 default: system
 *               modelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关联模型ID列表（多选）
 *               sampleUrl:
 *                 type: string
 *                 nullable: true
 *               avatarUrl:
 *                 type: string
 *                 nullable: true
 *                 description: 音色头像资源 URL（可选）
 *               description:
 *                 type: string
 *                 nullable: true
 *               meta:
 *                 type: string
 *                 nullable: true
 *               supportsVoiceCommand:
 *                 type: boolean
 *                 default: false
 *                 description: 是否支持语音指令（默认不支持）
 *               tags:
 *                 type: array
 *                 description: |
 *                   标签（JSON数组）。需要至少包含：
 *                   - `age`：年龄范围（如 18-25）
 *                   - `gender`：性别（`male`/`female`）
 *                   - `trait`：特征词（性格、外貌等，可多个）
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [age, gender, trait]
 *                     value:
 *                       type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *           examples:
 *             example1:
 *               summary: 绑定多个模型
 *               value:
 *                 voiceId: "v_001"
 *                 name: "温柔女声"
 *                 scope: "system"
 *                 modelIds: ["modelA", "modelB"]
 *                 sampleUrl: null
 *                 avatarUrl: null
 *                 description: null
 *                 supportsVoiceCommand: false
 *                 tags:
 *                   - type: "age"
 *                     value: "18-25"
 *                   - type: "gender"
 *                     value: "female"
 *                   - type: "trait"
 *                     value: "温柔"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 */
router.post(
  '/',
  createVoiceProfileValidator,
  validate,
  voiceProfileController.createVoiceProfile.bind(voiceProfileController)
)

/**
 * @swagger
 * /api/voice-profiles/clone:
 *   post:
 *     summary: 音色克隆（复刻声音并落库）[管理员/终端用户]
 *     description: |
 *       服务端使用指定或自动选择的 `UserApiKey` 调用提供商「复刻声音」接口，拿到 `voice_id` 后写入 `VoiceProfile`，并与 `modelId` 建立绑定。
 *
 *       **流程概要**
 *       1. 校验 `providerId`、`apiPath`（须在提供商 `voiceCloneApis` 白名单内）。
 *       2. 若未传 `userApiKeyId`，按角色与规则自动选择一条 `user_api_keys` 记录（见下）。
 *       3. 使用解密后的 Key 请求上游；解析响应中的 `voice_id`。
 *       4. 落库：`isModelLocked=true`；终端用户为 `scope=user` + 当前 `userId`；管理员为 `scope=system`。可选传 `name`、`sampleUrl`、`avatarUrl`、`description`、`tags`。
 *          `tags` 建议使用结构化标签：`age`（年龄段）、`gender`（male/female）、`trait`（特征词，可多个）。
 *       5. **积分**：`user`/`basic_user` 按 `voiceCloneCreditsPerCall` 扣 `UserApiKey.usedCredits` 并写流水；**`super_admin`/`platform_admin` 不扣费**，流水 `status=admin_exempt`。`VoiceProfile.meta`：终端用户为 `cloneCreditsCharged` 实扣；管理员为 0 且可带 `configuredCloneCost`。
 *
 *       **权限与 API Key**
 *       - **终端用户**（`user` / `basic_user`）：音色归属当前用户。调用上游时允许使用 **本人 `UserApiKey`**（`userId` = 当前用户）或 **系统级 Key**（`userId` 为空）；**禁止**使用他人名下 Key。
 *       - **自动选择 `userApiKeyId`（终端用户）**：候选为同 `providerId`、未过期、`status=active` 的本人 Key **与** 系统级 Key；**先整档优先本人 Key**，再在档内按「`Authorization` 绑定条数升序 → 剩余积分 `credits - usedCredits` 降序 → `id`」择优。
 *       - **管理员**：克隆结果为系统音色（`scope=system`）。自动选择时 **仅系统级 Key**；显式传入时可使用任意与 `providerId` 匹配且可用的 Key。
 *
 *       **curl 示例（终端用户，不传 Key，由后端择优）**
 *       ```bash
 *       curl -sS -X POST "$BASE/api/voice-profiles/clone" \
 *         -H "Authorization: Bearer $USER_JWT" -H "Content-Type: application/json" \
 *         -d '{"providerId":"...","apiPath":"/v1/audio/voices","prefix":"myvoice01","audioUrl":"https://.../sample.mp3","modelId":"...","name":"展示名称","sampleUrl":"https://.../preview.mp3"}'
 *       ```
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerId, apiPath, prefix, audioUrl, modelId]
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: 提供商 ID（须与 `modelId` 对应模型所属提供商一致）
 *                 example: clxxxxxxxxxxxxxxxxxx
 *               apiPath:
 *                 type: string
 *                 description: 复刻 API 的 path（须与 `AIProvider.voiceCloneApis` 中某项 `path` 完全一致）
 *                 example: /v1/audio/voices
 *               userApiKeyId:
 *                 type: string
 *                 nullable: true
 *                 description: |
 *                   可选。表 `user_api_keys` 主键 `id`。不传或传 `null` 时由后端自动选择。
 *                   终端用户可显式指定本人 Key 或系统级 Key；管理员自动选择时仅系统级 Key池。
 *               prefix:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9]+$'
 *                 description: 上游要求的音色前缀，**仅英文字母与数字**
 *                 example: clone01
 *               audioUrl:
 *                 type: string
 *                 format: uri
 *                 description: |
 *                   必填。调用上游「复刻」接口使用的样本音频 URL（公网可访问）。与可选字段 `sampleUrl`（仅落库展示/试听）不同：`audioUrl` 参与生成 `voice_id`。
 *                 example: https://cdn.example.com/user/sample.mp3
 *               sampleUrl:
 *                 type: string
 *                 nullable: true
 *                 description: |
 *                   可选。音色示例/试听链接（`VoiceProfile.sampleUrl`），可与 `audioUrl` 不同（如对外展示的短链或 CDN 试听地址）；不传或空串存 null，前后空格去除。
 *                 example: https://cdn.example.com/preview/myvoice01.mp3
 *               avatarUrl:
 *                 type: string
 *                 nullable: true
 *                 description: 可选。音色头像链接（`VoiceProfile.avatarUrl`）；不传或空串存 null，前后空格去除。
 *                 example: https://cdn.example.com/avatar/myvoice01.png
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: 可选。音色描述（`VoiceProfile.description`）；不传或空串存 null，前后空格去除。
 *                 example: 清晰温柔，适合客服播报
 *               tags:
 *                 type: array
 *                 nullable: true
 *                 description: |
 *                   可选。音色标签数组（写入 `VoiceProfile.tags`）。
 *                   建议结构：`age`（如 `18-25`）+ `gender`（`male`/`female`）+ 至少 1 个 `trait`（特征词，可多个）。
 *                 items:
 *                   type: object
 *                   required: [type, value]
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [age, gender, trait]
 *                       example: trait
 *                     value:
 *                       type: string
 *                       example: 温柔
 *               modelId:
 *                 type: string
 *                 description: 绑定模型 ID（克隆后不可改绑其它模型）
 *                 example: mdlxxxxxxxxxxxxxxxxxx
 *               name:
 *                 type: string
 *                 nullable: true
 *                 description: |
 *                   可选。本地展示用音色名称（`VoiceProfile.name`）；不传或空字符串则存为 null。前后空格会去除。
 *                 example: 我的复刻音色
 *           examples:
 *             autoUserApiKey:
 *               summary: 终端用户（不传 userApiKeyId，后端择优）
 *               value:
 *                 providerId: clxxxxxxxxxxxxxxxxxx
 *                 apiPath: /v1/audio/voices
 *                 prefix: myvoice01
 *                 audioUrl: https://cdn.example.com/sample.mp3
 *                 modelId: mdlxxxxxxxxxxxxxxxxxx
 *                 name: 我的复刻音色
 *                 sampleUrl: https://cdn.example.com/preview/myvoice01.mp3
 *                 avatarUrl: https://cdn.example.com/avatar/myvoice01.png
 *                 description: 清晰温柔，适合客服播报
 *                 tags:
 *                   - type: age
 *                     value: 18-25
 *                   - type: gender
 *                     value: female
 *                   - type: trait
 *                     value: 温柔
 *                   - type: trait
 *                     value: 亲和
 *             explicitUserApiKey:
 *               summary: 显式指定 UserApiKey（可选带展示名称）
 *               value:
 *                 providerId: clxxxxxxxxxxxxxxxxxx
 *                 apiPath: /v1/audio/voices
 *                 userApiKeyId: uak_xxxxxxxxxxxxxxxxxx
 *                 prefix: myvoice02
 *                 audioUrl: https://cdn.example.com/sample2.mp3
 *                 modelId: mdlxxxxxxxxxxxxxxxxxx
 *                 name: 展示用音色名
 *                 sampleUrl: https://cdn.example.com/preview/myvoice02.mp3
 *                 avatarUrl: https://cdn.example.com/avatar/myvoice02.png
 *                 description: 明亮、元气
 *                 tags:
 *                   - type: age
 *                     value: 18-25
 *                   - type: gender
 *                     value: female
 *                   - type: trait
 *                     value: 元气
 *                   - type: trait
 *                     value: 外向
 *             minimalRequiredOnly:
 *               summary: 仅必填字段（不传 name、sampleUrl、userApiKeyId）
 *               value:
 *                 providerId: clxxxxxxxxxxxxxxxxxx
 *                 apiPath: /v1/audio/voices
 *                 prefix: myvoice03
 *                 audioUrl: https://cdn.example.com/sample3.mp3
 *                 modelId: mdlxxxxxxxxxxxxxxxxxx
 *     responses:
 *       201:
 *         description: |
 *           创建成功。`data` 为音色对象（与列表项 `VoiceProfileListItem` 一致，含 `models` 等）。
 *           若请求传入 `name` / `sampleUrl`，响应中 `data.name`、`data.sampleUrl` 与落库一致；未传则为 `null`。
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VoiceProfileListItem'
 *             example:
 *               success: true
 *               message: Voice profile cloned successfully
 *               data:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 voiceId: voice_abc123
 *                 scope: user
 *                 userId: usrxxxxxxxxxxxxxxxxxx
 *                 name: 我的复刻音色
 *                 sampleUrl: https://cdn.example.com/preview/myvoice01.mp3
 *                 isModelLocked: true
 *                 isActive: true
 *                 models: []
 *       400:
 *         description: 参数错误、apiPath 不在白名单、上游失败、无可用 Key（自动选择时）等
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noKey:
 *                 summary: 无可用 Key（自动选择）
 *                 value:
 *                   success: false
 *                   message: No active API key for this provider; bind a key or pass userApiKeyId
 *               badApiPath:
 *                 summary: apiPath 未在白名单
 *                 value:
 *                   success: false
 *                   message: apiPath is not allowed for this provider
 *               invalidName:
 *                 summary: name 类型非法（须为 string 或 null）
 *                 value:
 *                   success: false
 *                   message: Validation failed
 *                   errors:
 *                     - field: name
 *                       message: name must be a string or null
 *               invalidSampleUrl:
 *                 summary: sampleUrl 类型非法（须为 string 或 null）
 *                 value:
 *                   success: false
 *                   message: Validation failed
 *                   errors:
 *                     - field: sampleUrl
 *                       message: sampleUrl must be a string or null
 *               invalidAvatarUrl:
 *                 summary: avatarUrl 类型非法（须为 string 或 null）
 *                 value:
 *                   success: false
 *                   message: Validation failed
 *                   errors:
 *                     - field: avatarUrl
 *                       message: avatarUrl must be a string or null
 *               invalidDescription:
 *                 summary: description 类型非法（须为 string 或 null）
 *                 value:
 *                   success: false
 *                   message: Validation failed
 *                   errors:
 *                     - field: description
 *                       message: description must be a string or null
 *               invalidTags:
 *                 summary: tags 类型非法（须为数组或 null）
 *                 value:
 *                   success: false
 *                   message: Validation failed
 *                   errors:
 *                     - field: tags
 *                       message: tags must be an array or null
 *               insufficientCloneCredits:
 *                 summary: API Key 剩余积分不足（AIProvider.voiceCloneCreditsPerCall）
 *                 value:
 *                   success: false
 *                   message: Insufficient API key credits for voice clone
 *       401:
 *         description: 未登录或 Token 无效
 *       403:
 *         description: 使用了非本人且非系统级的 Key 等
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: You can only clone using your own API Key or a system API key
 *       404:
 *         description: 提供商、模型或显式传入的 Key 不存在
 *       409:
 *         description: 上游返回的 voice_id 已存在于本地
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: voiceId already exists
 */
router.post(
  '/clone',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.USER, ROLES.BASIC_USER),
  cloneVoiceProfileValidator,
  validate,
  voiceProfileController.cloneVoiceProfile.bind(voiceProfileController)
)

/**
 * @swagger
 * /api/voice-profiles/{id}:
 *   put:
 *     summary: 更新音色 [管理员/终端用户]
 *     description: |
 *       更新音色信息。
 *
 *       **说明**：
 *       - `scope` 不可修改
 *       - `userId` 不可修改
 *       - 终端用户仅可更新自己的 `scope=user` 音色
 *       - `modelIds` 若传入则会整体替换绑定关系（不传则不修改）
 *       - 若音色 `isModelLocked=true`，则不允许更新模型绑定（`modelIds`/`modelId`）
 *       - `tags` 若传入，需满足结构化约束：必须包含 `age`、`gender(male/female)`、至少 1 个 `trait`
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voiceId:
 *                 type: string
 *               name:
 *                 type: string
 *                 nullable: true
 *               modelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               sampleUrl:
 *                 type: string
 *                 nullable: true
 *               avatarUrl:
 *                 type: string
 *                 nullable: true
 *                 description: 音色头像资源 URL（可选）
 *               description:
 *                 type: string
 *                 nullable: true
 *               meta:
 *                 type: string
 *                 nullable: true
 *               supportsVoiceCommand:
 *                 type: boolean
 *                 description: 是否支持语音指令（默认不支持）
 *               tags:
 *                 type: array
 *                 description: |
 *                   标签（JSON数组）。
 *                   若传入，必须包含：
 *                   - `age`：年龄范围（如 18-25）
 *                   - `gender`：性别（`male`/`female`）
 *                   - `trait`：特征词（至少 1 个，可多个）
 *                 items:
 *                   type: object
 *                   required: [type, value]
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [age, gender, trait]
 *                     value:
 *                       type: string
 *               isActive:
 *                 type: boolean
 *           examples:
 *             updateBasic:
 *               summary: 更新基础信息（不改模型绑定）
 *               value:
 *                 name: 客服女声A
 *                 sampleUrl: https://cdn.example.com/preview/service-a.mp3
 *                 avatarUrl: https://cdn.example.com/avatar/service-a.png
 *                 description: 明亮亲和，适合客服播报
 *                 tags:
 *                   - type: age
 *                     value: 18-25
 *                   - type: gender
 *                     value: female
 *                   - type: trait
 *                     value: 温柔
 *                   - type: trait
 *                     value: 亲和
 *                 isActive: true
 *             replaceModels:
 *               summary: 替换模型绑定（仅未锁定音色）
 *               value:
 *                 modelIds: [mdlxxxxxxxxxxxxxxxxxx, mdlyyyyyyyyyyyyyyyyyy]
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VoiceProfileListItem'
 *       400:
 *         description: 参数错误（如 `scope`/`userId` 尝试修改、`tags` 结构不合法、模型绑定已锁定）
 *       403:
 *         description: 无权更新该音色
 *       404:
 *         description: 音色不存在
 *       409:
 *         description: `voiceId` 冲突（已存在）
 */
router.put(
  '/:id',
  updateVoiceProfileValidator,
  validate,
  voiceProfileController.updateVoiceProfile.bind(voiceProfileController)
)

/**
 * @swagger
 * /api/voice-profiles/{id}:
 *   delete:
 *     summary: 删除音色 [管理员/终端用户]
 *     description: |
 *       删除音色记录。
 *
 *       **说明**：
 *       - 终端用户仅可删除自己的 `scope=user` 音色
 *       - 若该音色来自克隆流程且 `meta` 携带上游删除必要信息，服务端会先尝试调用上游 `delete_voice`，成功后再删除本地记录
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Voice profile deleted successfully
 *       400:
 *         description: 远程删除前置条件不满足或第三方删除失败
 *       403:
 *         description: 无权删除该音色
 *       404:
 *         description: 音色不存在
 */
router.delete(
  '/:id',
  deleteVoiceProfileValidator,
  validate,
  voiceProfileController.deleteVoiceProfile.bind(voiceProfileController)
)

module.exports = router

