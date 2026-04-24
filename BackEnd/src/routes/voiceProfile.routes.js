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
 *     summary: 音色克隆（复刻声音并落库）[管理员]
 *     description: |
 *       调用提供商的“复刻声音”接口创建 voice_id，并创建本地音色记录（VoiceProfile）。
 *       该方式创建的音色将 **锁定绑定模型**（只能绑定一个模型，后续不可修改）。
 *     tags: [语音管理-音色]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerId, apiPath, userApiKeyId, prefix, audioUrl, modelId]
 *             properties:
 *               providerId:
 *                 type: string
 *               apiPath:
 *                 type: string
 *                 description: 复刻声音 API path（从 provider.voiceCloneApis 选择）
 *               userApiKeyId:
 *                 type: string
 *                 description: 调用复刻接口用的 API Key 记录ID（UserApiKey.id）
 *               prefix:
 *                 type: string
 *                 description: 音色前缀；上游接口要求 **仅英文字母与数字**（不能含空格、下划线、中文等）
 *               audioUrl:
 *                 type: string
 *                 description: 公网可访问的音频文件URL
 *               modelId:
 *                 type: string
 *                 description: 绑定的模型ID（仅支持绑定一个）
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       403:
 *         description: 权限不足
 */
router.post(
  '/clone',
  authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN),
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
 *       - 终端用户仅可更新自己的 `scope=user` 音色
 *       - `modelIds` 若传入则会整体替换绑定关系（不传则不修改）
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
 *                 description: 标签（JSON数组），同创建接口
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     value:
 *                       type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 音色不存在
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

