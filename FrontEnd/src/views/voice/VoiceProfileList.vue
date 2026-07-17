<template>
  <div class="voice-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">音色管理</h1>
        <p class="page-description">管理系统/用户音色，可选关联模型（不关联表示公共）。</p>
      </div>
      <div class="header-actions">
        <el-button @click="openPublicUploadDialog">上传文件到公网</el-button>
        <el-button type="warning" @click="openCloneDialog">音色克隆</el-button>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增音色</el-button>
      </div>
    </div>

    <div class="filter-section">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索音色ID/名称"
        clearable
        style="width: 260px"
      />
      <el-select v-model="filters.scope" placeholder="范围" clearable style="width: 140px">
        <el-option label="系统" value="system" />
        <el-option label="用户" value="user" />
      </el-select>
      <el-select v-model="filters.isActive" placeholder="状态" clearable style="width: 140px">
        <el-option label="启用" :value="true" />
        <el-option label="禁用" :value="false" />
      </el-select>
      <el-button @click="handleSearch">搜索</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%" row-key="id">
      <el-table-column prop="voiceId" label="音色ID" min-width="180" />
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column prop="scope" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.scope === 'system' ? 'success' : 'info'" size="small">
            {{ row.scope === 'system' ? '系统' : '用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联模型" min-width="180">
        <template #default="{ row }">
          <span v-if="row.models && row.models.length">
            {{
              row.models
                .map(x => x.model)
                .filter(Boolean)
                .map(m => m.displayName || m.name)
                .join('、')
            }}
          </span>
          <span v-else class="muted">公共</span>
        </template>
      </el-table-column>
      <el-table-column label="示例" min-width="200">
        <template #default="{ row }">
          <a v-if="row.sampleUrl" :href="row.sampleUrl" target="_blank" rel="noreferrer">查看</a>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog
      v-model="formVisible"
      :title="formData.id ? '编辑音色' : '新增音色'"
      width="680px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="110px" class="catalog-binding-form">
        <CatalogRoleBindingField
          v-model:client-role-bind-all="formData.clientRoleBindAll"
          v-model:client-role-ids="formData.clientRoleIds"
          required
        />
        <el-form-item label="音色ID" required>
          <el-input v-model="formData.voiceId" :disabled="!!formData.id" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="formData.scope" style="width: 100%">
            <el-option label="系统" value="system" />
            <el-option label="用户" value="user" />
          </el-select>
          <div class="tip">用户类型会自动关联当前用户（后端强制）。</div>
        </el-form-item>
        <el-form-item label="关联模型">
          <el-select
            v-model="formData.modelIds"
            multiple
            clearable
            filterable
            style="width: 100%"
            :loading="modelsLoading"
            :disabled="formData.isModelLocked"
          >
            <el-option
              v-for="m in models"
              :key="m.id"
              :label="m.displayName || m.name"
              :value="m.id"
            />
          </el-select>
          <div class="tip" v-if="formData.isModelLocked">
            该音色为克隆生成，模型绑定已锁定，不可修改。
          </div>
          <div class="tip" v-else>不选择表示公共音色；可选择多个模型。</div>
        </el-form-item>
        <el-form-item label="示例URL">
          <el-input v-model="formData.sampleUrl" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="formData.avatarUrl" placeholder="https://..." />
          <div class="tip">用于展示音色头像的公网资源地址（可选）。</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="年龄" required>
          <el-select
            v-model="formData.tagAge"
            clearable
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="选择或输入年龄范围（如 18-25 / 25-35 / 60+）"
          >
            <el-option label="0-12" value="0-12" />
            <el-option label="13-17" value="13-17" />
            <el-option label="18-25" value="18-25" />
            <el-option label="26-35" value="26-35" />
            <el-option label="36-45" value="36-45" />
            <el-option label="46-60" value="46-60" />
            <el-option label="60+" value="60+" />
          </el-select>
        </el-form-item>

        <el-form-item label="性别" required>
          <el-radio-group v-model="formData.tagGender">
            <el-radio label="male">male（男性）</el-radio>
            <el-radio label="female">female（女性）</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="特征词" required>
          <el-select
            v-model="formData.tagTraits"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 100%"
            placeholder="输入后回车，可多个（性格/外貌等）"
          />
          <div class="tip">至少填写 1 个特征词。</div>
        </el-form-item>
        <el-form-item label="语音指令">
          <el-switch v-model="formData.supportsVoiceCommand" />
          <div class="tip">默认不支持；开启后表示该音色支持语音指令。</div>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="formData.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 公网文件上传（本地直连第三方，注意 CORS） -->
    <el-dialog
      v-model="publicUploadVisible"
      width="960px"
      align-center
      destroy-on-close
      class="public-upload-dialog"
      @closed="onPublicUploadDialogClosed"
    >
      <template #header>
        <div class="pub-dlg-header">
          <h2 class="pub-dlg-title">多功能文件上传测试</h2>
          <p class="pub-dlg-sub">支持自定义 API 接口与 Catbox 免登上传</p>
        </div>
      </template>
      <div class="pub-upload-tool">
        <div class="pub-grid">
          <div class="pub-col-left">
            <div class="pub-card">
              <h3 class="pub-card-title">
                <span class="pub-card-title-icon" aria-hidden="true">⚙</span>
                配置中心
              </h3>
              <div class="pub-tabs">
                <button
                  type="button"
                  class="pub-tab"
                  :class="{ 'pub-tab-active': publicUploadMode === 'custom' }"
                  @click="publicUploadMode = 'custom'"
                >
                  自定义 API
                </button>
                <button
                  type="button"
                  class="pub-tab"
                  :class="{ 'pub-tab-active': publicUploadMode === 'catbox' }"
                  @click="publicUploadMode = 'catbox'"
                >
                  Catbox
                </button>
              </div>
              <div v-show="publicUploadMode === 'custom'" class="pub-fields">
                <label class="pub-label">Base URL</label>
                <input
                  v-model="publicUploadForm.baseUrl"
                  type="text"
                  class="pub-input"
                  :placeholder="DEFAULT_PUB_BASE"
                  @blur="persistPublicUploadSettings"
                />
                <label class="pub-label">提供商</label>
                <el-select
                  v-model="publicUploadProviderId"
                  class="pub-el-select"
                  filterable
                  clearable
                  placeholder="选择提供商"
                  @change="onPublicUploadProviderChange"
                >
                  <el-option
                    v-for="p in providers"
                    :key="p.id"
                    :label="p.displayName || p.name"
                    :value="p.id"
                  />
                </el-select>
                <label class="pub-label">API Key</label>
                <el-select
                  v-model="publicUploadUserApiKeyId"
                  class="pub-el-select"
                  filterable
                  clearable
                  placeholder="先选择提供商"
                  :disabled="!publicUploadProviderId"
                  :loading="publicUploadKeysLoading"
                  @change="persistPublicUploadSettings"
                >
                  <el-option
                    v-for="k in publicUploadKeys"
                    :key="k.id"
                    :value="k.id"
                    :label="publicKeyOptionLabel(k)"
                  >
                    <div class="pub-key-opt">
                      <div class="pub-key-opt-title">{{ k.name }}</div>
                      <div class="pub-key-opt-meta">{{ publicKeyOptionSubline(k) }}</div>
                    </div>
                  </el-option>
                </el-select>
              </div>
              <div v-show="publicUploadMode === 'catbox'" class="pub-fields">
                <label class="pub-label">Userhash (可选)</label>
                <input
                  v-model="publicUploadForm.userhash"
                  type="text"
                  class="pub-input"
                  placeholder="用于追踪已上传的文件"
                  @blur="persistPublicUploadSettings"
                />
                <p class="pub-hint-muted">上传终点: catbox.moe/user/api.php</p>
              </div>
            </div>
            <div class="pub-tip-box">
              <p class="pub-tip-title">提示：</p>
              <ul class="pub-tip-list">
                <li>自定义模式：使用 <code>file</code> 字段名；Key 从「提供商 → API Key」选择</li>
                <li>Catbox 模式：使用 <code>fileToUpload</code></li>
                <li>严禁上传非法或违规内容</li>
              </ul>
            </div>
          </div>
          <div class="pub-col-right">
            <div class="pub-card">
              <h3 class="pub-card-title">上传文件</h3>
              <div
                class="pub-drop-zone"
                :class="{ 'pub-drop-zone-over': publicDropOver }"
                @click="triggerPublicFilePick"
                @dragover.prevent="publicDropOver = true"
                @dragleave.prevent="publicDropOver = false"
                @drop.prevent="onPublicFileDrop"
              >
                <span class="pub-drop-icon" aria-hidden="true">☁</span>
                <p class="pub-drop-main">点击或拖拽文件到此处</p>
                <p class="pub-drop-sub">Max: 20MB (Catbox 支持 200MB)</p>
                <input
                  ref="publicFileInputRef"
                  type="file"
                  class="pub-file-input"
                  @change="onPublicFileInputChange"
                />
              </div>
              <div v-if="publicSelectedFile" class="pub-file-preview">
                <div class="pub-file-preview-left">
                  <span class="pub-file-doc" aria-hidden="true">▤</span>
                  <span class="pub-file-name" :title="publicSelectedFile.name">{{
                    publicFileLabel
                  }}</span>
                </div>
                <button
                  type="button"
                  class="pub-file-remove"
                  title="移除"
                  @click.stop="clearPublicFile"
                >
                  ✕
                </button>
              </div>
              <el-button
                type="primary"
                class="pub-submit-btn"
                :disabled="!publicSelectedFile || publicUploading"
                :loading="publicUploading"
                @click="runPublicUpload"
              >
                {{ publicUploading ? '上传中...' : '开始上传' }}
              </el-button>
            </div>
            <div
              v-if="publicStatus.text"
              class="pub-status"
              :class="'pub-status-' + publicStatus.type"
            >
              {{ publicStatus.text }}
            </div>
            <div class="pub-response-wrap">
              <div class="pub-response-head">
                <span class="pub-response-head-label">服务器响应</span>
                <button type="button" class="pub-copy-btn" @click="copyPublicResponse">复制</button>
              </div>
              <pre class="pub-response-body">{{ publicResponseText }}</pre>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 音色克隆 -->
    <el-dialog v-model="cloneVisible" title="音色克隆" width="720px" destroy-on-close>
      <el-form :model="cloneForm" label-width="140px">
        <el-form-item label="提供商" required>
          <el-select
            v-model="cloneForm.providerId"
            filterable
            clearable
            style="width: 100%"
            @change="handleCloneProviderChange"
          >
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.displayName || p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="复刻API Path" required>
          <el-select v-model="cloneForm.apiPath" filterable clearable style="width: 100%">
            <el-option v-for="a in cloneApis" :key="a.path" :label="a.name" :value="a.path" />
          </el-select>
        </el-form-item>

        <el-form-item label="API Key" required>
          <el-select
            v-model="cloneForm.userApiKeyId"
            filterable
            clearable
            style="width: 100%"
            :loading="keysLoading"
          >
            <el-option v-for="k in providerApiKeys" :key="k.id" :label="k.name" :value="k.id" />
          </el-select>
          <div class="tip">选择供应商 API Key 管理（图二）里的 Key，用于调用复刻接口。</div>
        </el-form-item>

        <el-form-item label="音色前缀名" required>
          <el-input v-model="cloneForm.prefix" placeholder="例如：myvoice001（仅英文与数字）" />
          <div class="tip">上游接口要求：仅英文字母与数字，不能含空格、下划线、中文或连字符。</div>
        </el-form-item>

        <el-form-item label="音频URL" required>
          <el-input v-model="cloneForm.audioUrl" placeholder="公网可访问音频文件URL" />
        </el-form-item>

        <el-form-item label="音色示例链接">
          <el-input v-model="cloneForm.sampleUrl" placeholder="可选，试听/展示用 URL（写入 sampleUrl）" />
        </el-form-item>

        <el-form-item label="头像URL">
          <el-input v-model="cloneForm.avatarUrl" placeholder="可选，音色头像链接（写入 avatarUrl）" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="cloneForm.description"
            type="textarea"
            :rows="2"
            placeholder="可选，音色描述（写入 description）"
          />
        </el-form-item>

        <el-form-item label="年龄" required>
          <el-select
            v-model="cloneForm.tagAge"
            clearable
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="选择或输入年龄范围（如 18-25 / 25-35 / 60+）"
          >
            <el-option label="0-12" value="0-12" />
            <el-option label="13-17" value="13-17" />
            <el-option label="18-25" value="18-25" />
            <el-option label="26-35" value="26-35" />
            <el-option label="36-45" value="36-45" />
            <el-option label="46-60" value="46-60" />
            <el-option label="60+" value="60+" />
          </el-select>
        </el-form-item>

        <el-form-item label="性别" required>
          <el-radio-group v-model="cloneForm.tagGender">
            <el-radio label="male">male（男性）</el-radio>
            <el-radio label="female">female（女性）</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="特征词" required>
          <el-select
            v-model="cloneForm.tagTraits"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 100%"
            placeholder="输入后回车，可多个（性格/外貌等）"
          />
          <div class="tip">至少填写 1 个特征词。</div>
        </el-form-item>

        <el-form-item label="绑定模型（仅一个）" required>
          <el-select
            v-model="cloneForm.modelId"
            clearable
            filterable
            style="width: 100%"
            :loading="modelsLoading"
          >
            <el-option
              v-for="m in models"
              :key="m.id"
              :label="m.displayName || m.name"
              :value="m.id"
            />
          </el-select>
          <div class="tip">通过克隆生成的音色将锁定绑定模型，后续不可更改。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cloneVisible = false">取消</el-button>
        <el-button type="primary" :loading="cloning" @click="submitClone">开始克隆</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getVoiceProfiles,
  createVoiceProfile,
  updateVoiceProfile,
  deleteVoiceProfile,
  cloneVoiceProfile
} from '@/api/voiceProfile'
import { getModels } from '@/api/model'
import { getProviders } from '@/api/provider'
import { getProviderApiKeys, revealProviderApiKeyToken } from '@/api/providerApiKey'
import CatalogRoleBindingField from '@/views/components/CatalogRoleBindingField.vue'

const loading = ref(false)
const modelsLoading = ref(false)
const tableData = ref([])
const models = ref([])

const filters = reactive({
  keyword: '',
  scope: '',
  isActive: undefined
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const formVisible = ref(false)
const submitting = ref(false)
const cloneVisible = ref(false)
const cloning = ref(false)
const keysLoading = ref(false)

const DEFAULT_PUB_BASE = 'https://ai.t8star.cn'
const LS_PUB_BASE = 'voice_pub_upload_base_url'
const LS_PUB_PROVIDER = 'voice_pub_upload_provider_id'
const LS_PUB_KEY_ID = 'voice_pub_upload_user_api_key_id'
const LS_PUB_HASH = 'voice_pub_upload_catbox_hash'

const publicUploadVisible = ref(false)
const publicUploadMode = ref('custom')
const publicUploadForm = reactive({
  baseUrl: DEFAULT_PUB_BASE,
  userhash: ''
})
const publicUploadProviderId = ref('')
const publicUploadUserApiKeyId = ref('')
const publicUploadKeys = ref([])
const publicUploadKeysLoading = ref(false)
const publicFileInputRef = ref(null)
const publicSelectedFile = ref(null)
const publicDropOver = ref(false)
const publicUploading = ref(false)
const publicResponseText = ref('等待上传...')
const publicStatus = reactive({ type: 'info', text: '' })

const publicFileLabel = computed(() => {
  const f = publicSelectedFile.value
  if (!f) return ''
  const mb = (f.size / 1024 / 1024).toFixed(2)
  return `${f.name} (${mb} MB)`
})
const formData = reactive({
  id: '',
  voiceId: '',
  name: '',
  scope: 'system',
  modelIds: [],
  originalModelIds: [],
  isModelLocked: false,
  sampleUrl: '',
  avatarUrl: '',
  description: '',
  supportsVoiceCommand: false,
  // tags（后端要求必须包含：age/gender/trait）
  tagAge: '',
  tagGender: '',
  tagTraits: [],
  isActive: true,
  clientRoleBindAll: true,
  clientRoleIds: []
})

const providers = ref([])
const providerApiKeys = ref([])
const cloneApis = ref([])

const cloneForm = reactive({
  providerId: '',
  apiPath: '',
  userApiKeyId: '',
  prefix: '',
  audioUrl: '',
  sampleUrl: '',
  avatarUrl: '',
  description: '',
  tagAge: '',
  tagGender: '',
  tagTraits: [],
  modelId: ''
})

async function fetchModels() {
  modelsLoading.value = true
  try {
    const res = await getModels({ page: 1, pageSize: 1000, isActive: true, type: 'tts' })
    if (res.success) models.value = res.data || []
  } finally {
    modelsLoading.value = false
  }
}

async function fetchProviders() {
  const res = await getProviders({ page: 1, pageSize: 1000, isActive: true })
  if (res.success) providers.value = res.data || []
}

async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      order: 'desc'
    }
    if (filters.scope) params.scope = filters.scope
    if (filters.isActive !== undefined) params.isActive = filters.isActive
    if (filters.keyword) {
      params.voiceId = filters.keyword
      params.name = filters.keyword
    }
    const res = await getVoiceProfiles(params)
    if (res.success) {
      tableData.value = res.data || []
      if (res.pagination) {
        pagination.total = res.pagination.total || 0
        pagination.page = res.pagination.page || 1
        pagination.pageSize = res.pagination.pageSize || 20
      }
    }
  } catch {
    ElMessage.error('获取音色列表失败')
  } finally {
    loading.value = false
  }
}

function triggerPublicFilePick() {
  publicFileInputRef.value?.click()
}

function loadPublicUploadSettings() {
  const savedBase = (localStorage.getItem(LS_PUB_BASE) || '').trim()
  // 曾用占位文案被误存进 localStorage 时，回退为默认
  const invalidExample = savedBase === 'https://api.example.com'
  publicUploadForm.baseUrl = !savedBase || invalidExample ? DEFAULT_PUB_BASE : savedBase
  publicUploadForm.userhash = localStorage.getItem(LS_PUB_HASH) || ''
  publicUploadProviderId.value = localStorage.getItem(LS_PUB_PROVIDER) || ''
  publicUploadUserApiKeyId.value = localStorage.getItem(LS_PUB_KEY_ID) || ''
}

function persistPublicUploadSettings() {
  const base = (publicUploadForm.baseUrl || '').trim() || DEFAULT_PUB_BASE
  publicUploadForm.baseUrl = base
  localStorage.setItem(LS_PUB_BASE, base)
  localStorage.setItem(LS_PUB_HASH, publicUploadForm.userhash)
  localStorage.setItem(LS_PUB_PROVIDER, publicUploadProviderId.value || '')
  localStorage.setItem(LS_PUB_KEY_ID, publicUploadUserApiKeyId.value || '')
}

function formatPublicKeyQuotaPart(k) {
  const credits = parseFloat(k.credits) || 0
  if (credits <= 0) return '额度无限制'
  const rem = k.remainingCredits
  if (rem == null) return '剩余额度 -'
  const n = Number(rem)
  return `剩余额度 ${Number.isInteger(n) ? String(n) : n.toFixed(2)}`
}

function publicKeyOptionSubline(k) {
  return `已绑音色 ${k.voiceCount ?? 0} · ${formatPublicKeyQuotaPart(k)}`
}

function publicKeyOptionLabel(k) {
  return `${k.name} · ${publicKeyOptionSubline(k)}`
}

async function fetchPublicUploadKeys(providerId) {
  publicUploadKeys.value = []
  if (!providerId) return
  publicUploadKeysLoading.value = true
  try {
    const res = await getProviderApiKeys(providerId, { userId: 'null', status: 'active' })
    if (res.success) publicUploadKeys.value = res.data || []
  } finally {
    publicUploadKeysLoading.value = false
  }
}

function onPublicUploadProviderChange() {
  publicUploadUserApiKeyId.value = ''
  fetchPublicUploadKeys(publicUploadProviderId.value)
  persistPublicUploadSettings()
}

async function openPublicUploadDialog() {
  loadPublicUploadSettings()
  publicUploadMode.value = 'custom'
  publicResponseText.value = '等待上传...'
  publicStatus.text = ''
  publicSelectedFile.value = null
  publicDropOver.value = false
  publicUploadVisible.value = true
  if (publicUploadProviderId.value) {
    await fetchPublicUploadKeys(publicUploadProviderId.value)
    if (!publicUploadKeys.value.some(x => x.id === publicUploadUserApiKeyId.value)) {
      publicUploadUserApiKeyId.value = ''
      persistPublicUploadSettings()
    }
  }
}

function onPublicUploadDialogClosed() {
  publicSelectedFile.value = null
  publicDropOver.value = false
  if (publicFileInputRef.value) publicFileInputRef.value.value = ''
}

function setPublicStatus(msg, type = 'info') {
  publicStatus.text = msg
  publicStatus.type = type
}

function pickPublicFile(file) {
  if (!file) return
  const maxSize = publicUploadMode.value === 'catbox' ? 200 * 1024 * 1024 : 20 * 1024 * 1024
  if (file.size > maxSize) {
    setPublicStatus(
      `文件大小超过限制 (${publicUploadMode.value === 'catbox' ? '200MB' : '20MB'})`,
      'error'
    )
    return
  }
  publicSelectedFile.value = file
  setPublicStatus('准备就绪', 'info')
}

function onPublicFileInputChange(e) {
  const f = e.target.files && e.target.files[0]
  pickPublicFile(f)
}

function onPublicFileDrop(e) {
  publicDropOver.value = false
  const f = e.dataTransfer?.files?.[0]
  pickPublicFile(f)
}

function clearPublicFile() {
  publicSelectedFile.value = null
  if (publicFileInputRef.value) publicFileInputRef.value.value = ''
}

async function runPublicUpload() {
  const file = publicSelectedFile.value
  if (!file) return

  publicUploading.value = true
  publicResponseText.value = '正在处理请求...'

  const formData = new FormData()
  let url = ''
  const headers = {}

  if (publicUploadMode.value === 'custom') {
    const baseUrl = publicUploadForm.baseUrl.trim()
    if (!baseUrl) {
      setPublicStatus('请输入 Base URL', 'error')
      publicUploading.value = false
      return
    }
    if (!publicUploadProviderId.value || !publicUploadUserApiKeyId.value) {
      setPublicStatus('请选择提供商与 API Key', 'error')
      publicUploading.value = false
      return
    }
    let tokenRes
    try {
      tokenRes = await revealProviderApiKeyToken(
        publicUploadProviderId.value,
        publicUploadUserApiKeyId.value
      )
    } catch {
      tokenRes = { success: false, message: '获取 API Key 失败' }
    }
    if (!tokenRes?.success || !tokenRes.data?.token) {
      setPublicStatus(tokenRes?.message || '获取 API Key 失败（需超级/平台管理员权限）', 'error')
      publicUploading.value = false
      return
    }
    const apiKey = String(tokenRes.data.token).trim()
    url = `${baseUrl.replace(/\/$/, '')}/v1/files`
    formData.append('file', file)
    headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  } else {
    url = 'https://catbox.moe/user/api.php'
    formData.append('reqtype', 'fileupload')
    formData.append('fileToUpload', file)
    const h = publicUploadForm.userhash.trim()
    if (h) formData.append('userhash', h)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    })
    const text = await response.text()
    let displayData
    try {
      displayData = JSON.parse(text)
    } catch {
      displayData = {
        status: response.ok ? 'success' : 'failed',
        response_type: 'plain_text',
        result: text
      }
    }
    publicResponseText.value = JSON.stringify(displayData, null, 2)
    if (response.ok) {
      setPublicStatus('上传成功！', 'success')
    } else {
      setPublicStatus(`上传失败: ${response.status}`, 'error')
    }
  } catch (err) {
    setPublicStatus('请求出错 (请检查网络或 CORS 设置)', 'error')
    publicResponseText.value = `Error: ${err?.message || String(err)}\n\n注意: 如果您上传到 Catbox 遇到跨域错误，这是由于 Catbox API 限制。`
  } finally {
    publicUploading.value = false
  }
}

async function copyPublicResponse() {
  const text = publicResponseText.value
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择文本复制')
  }
}

function openCloneDialog() {
  Object.assign(cloneForm, {
    providerId: '',
    apiPath: '',
    userApiKeyId: '',
    prefix: '',
    audioUrl: '',
    sampleUrl: '',
    avatarUrl: '',
    description: '',
    tagAge: '',
    tagGender: '',
    tagTraits: [],
    modelId: ''
  })
  cloneApis.value = []
  providerApiKeys.value = []
  cloneVisible.value = true
}

async function handleCloneProviderChange() {
  cloneForm.apiPath = ''
  cloneForm.userApiKeyId = ''
  cloneApis.value = []
  providerApiKeys.value = []

  const p = providers.value.find(x => x.id === cloneForm.providerId)
  if (p?.voiceCloneApis) {
    try {
      const parsed = JSON.parse(p.voiceCloneApis)
      cloneApis.value = Array.isArray(parsed) ? parsed : []
    } catch {
      cloneApis.value = []
    }
  }

  if (!cloneForm.providerId) return
  keysLoading.value = true
  try {
    const res = await getProviderApiKeys(cloneForm.providerId, { userId: 'null', status: 'active' })
    if (res.success) providerApiKeys.value = res.data || []
  } finally {
    keysLoading.value = false
  }
}

const CLONE_PREFIX_RE = /^[a-zA-Z0-9]+$/

async function submitClone() {
  if (
    !cloneForm.providerId ||
    !cloneForm.apiPath ||
    !cloneForm.userApiKeyId ||
    !cloneForm.prefix ||
    !cloneForm.audioUrl ||
    !cloneForm.modelId
  ) {
    ElMessage.warning('请完整填写克隆信息')
    return
  }
  const prefixTrimmed = String(cloneForm.prefix).trim()
  if (!CLONE_PREFIX_RE.test(prefixTrimmed)) {
    ElMessage.warning('音色前缀仅支持英文字母与数字，不能含空格、下划线或中文等')
    return
  }
  const age = String(cloneForm.tagAge || '').trim()
  const gender = String(cloneForm.tagGender || '').trim()
  const traits = [...new Set((cloneForm.tagTraits || []).map(x => String(x || '').trim()).filter(Boolean))]
  if (!age) {
    ElMessage.warning('请选择年龄范围')
    return
  }
  if (!(gender === 'male' || gender === 'female')) {
    ElMessage.warning('请选择性别（male/female）')
    return
  }
  if (traits.length === 0) {
    ElMessage.warning('请至少填写 1 个特征词')
    return
  }
  cloning.value = true
  try {
    const parsedTags = [
      { type: 'age', value: age },
      { type: 'gender', value: gender },
      ...traits.map(v => ({ type: 'trait', value: v }))
    ]

    const res = await cloneVoiceProfile({
      providerId: cloneForm.providerId,
      apiPath: cloneForm.apiPath,
      userApiKeyId: cloneForm.userApiKeyId,
      prefix: prefixTrimmed,
      audioUrl: cloneForm.audioUrl,
      modelId: cloneForm.modelId,
      ...(String(cloneForm.sampleUrl || '').trim()
        ? { sampleUrl: String(cloneForm.sampleUrl).trim() }
        : {}),
      ...(String(cloneForm.avatarUrl || '').trim()
        ? { avatarUrl: String(cloneForm.avatarUrl).trim() }
        : {}),
      ...(String(cloneForm.description || '').trim()
        ? { description: String(cloneForm.description).trim() }
        : {}),
      ...(parsedTags.length ? { tags: parsedTags } : {})
    })
    if (res.success) {
      ElMessage.success('克隆成功')
      cloneVisible.value = false
      fetchData()
    }
  } finally {
    cloning.value = false
  }
}
function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleAdd() {
  Object.assign(formData, {
    id: '',
    voiceId: '',
    name: '',
    scope: 'system',
    modelIds: [],
    originalModelIds: [],
    isModelLocked: false,
    sampleUrl: '',
    avatarUrl: '',
    description: '',
    supportsVoiceCommand: false,
    tagAge: '',
    tagGender: '',
    tagTraits: [],
    isActive: true,
    clientRoleBindAll: true,
    clientRoleIds: []
  })
  formVisible.value = true
}

function handleEdit(row) {
  const modelIds = Array.isArray(row.models) ? row.models.map(x => x.modelId).filter(Boolean) : []
  const tags = Array.isArray(row.tags) ? row.tags : []
  const tagAge = tags.find(t => t && t.type === 'age')?.value || ''
  const tagGender = tags.find(t => t && t.type === 'gender')?.value || ''
  const tagTraits = tags
    .filter(t => t && t.type === 'trait' && t.value)
    .map(t => t.value)
  Object.assign(formData, {
    id: row.id,
    voiceId: row.voiceId,
    name: row.name || '',
    scope: row.scope,
    modelIds: [...modelIds],
    originalModelIds: [...modelIds],
    isModelLocked: row.isModelLocked === true,
    sampleUrl: row.sampleUrl || '',
    avatarUrl: row.avatarUrl || '',
    description: row.description || '',
    supportsVoiceCommand: row.supportsVoiceCommand === true,
    tagAge,
    tagGender,
    tagTraits,
    isActive: row.isActive === true,
    clientRoleBindAll: row.clientRoleBindAll !== false,
    clientRoleIds: Array.isArray(row.clientRoleIds) ? [...row.clientRoleIds] : []
  })
  formVisible.value = true
}

function handleDelete(row) {
  ElMessageBox.confirm(`确定删除音色 "${row.voiceId}" 吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      const res = await deleteVoiceProfile(row.id)
      if (res.success) {
        ElMessage.success('删除成功')
        fetchData()
      }
    })
    .catch(() => {})
}

async function handleSubmit() {
  if (!formData.voiceId) {
    ElMessage.warning('请填写音色ID')
    return
  }
  const age = String(formData.tagAge || '').trim()
  const gender = String(formData.tagGender || '').trim()
  const traits = [...new Set((formData.tagTraits || []).map(x => String(x || '').trim()).filter(Boolean))]

  if (!age) {
    ElMessage.warning('请选择年龄范围')
    return
  }
  if (!(gender === 'male' || gender === 'female')) {
    ElMessage.warning('请选择性别（male/female）')
    return
  }
  if (traits.length === 0) {
    ElMessage.warning('请至少填写 1 个特征词')
    return
  }

  submitting.value = true
  try {
    const normalize = arr =>
      [...new Set((arr || []).filter(Boolean))]
        .slice()
        .sort((a, b) => String(a).localeCompare(String(b)))

    const payload = {
      voiceId: formData.voiceId,
      name: formData.name || null,
      scope: formData.scope,
      sampleUrl: formData.sampleUrl || null,
      avatarUrl: formData.avatarUrl || null,
      description: formData.description || null,
      supportsVoiceCommand: formData.supportsVoiceCommand === true,
      tags: [
        { type: 'age', value: age },
        { type: 'gender', value: gender },
        ...traits.map((v) => ({ type: 'trait', value: v }))
      ],
      isActive: formData.isActive,
      clientRoleBindAll: formData.clientRoleBindAll,
      clientRoleIds: formData.clientRoleIds
    }

    // 编辑：如果模型绑定未变化，则不传 modelIds，避免后端误判为“尝试更新绑定”
    if (formData.id) {
      const nextIds = normalize(formData.modelIds)
      const prevIds = normalize(formData.originalModelIds)
      if (JSON.stringify(nextIds) !== JSON.stringify(prevIds)) {
        payload.modelIds = formData.modelIds || []
      }
    } else {
      payload.modelIds = formData.modelIds || []
    }
    const res = formData.id
      ? await updateVoiceProfile(formData.id, payload)
      : await createVoiceProfile(payload)
    if (res.success) {
      ElMessage.success(formData.id ? '更新成功' : '创建成功')
      formVisible.value = false
      fetchData()
    }
  } finally {
    submitting.value = false
  }
}

function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

watch(publicUploadMode, () => {
  const f = publicSelectedFile.value
  if (!f) return
  const maxSize = publicUploadMode.value === 'catbox' ? 200 * 1024 * 1024 : 20 * 1024 * 1024
  if (f.size > maxSize) {
    setPublicStatus(
      `当前文件超过 ${publicUploadMode.value === 'catbox' ? '200MB' : '20MB'} 限制，请重新选择`,
      'error'
    )
    clearPublicFile()
  }
})

onMounted(() => {
  fetchModels()
  fetchProviders()
  fetchData()
})
</script>

<style scoped>
.catalog-binding-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}

.voice-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.page-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.filter-section {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.muted {
  color: #94a3b8;
}

.tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
}

/* —— 公网文件上传弹窗（对齐示例 HTML 的视觉结构） —— */
.public-upload-dialog :deep(.el-dialog__header) {
  padding-bottom: 4px;
  margin-right: 0;
}

.public-upload-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  max-height: calc(92vh - 120px);
  overflow-y: auto;
}

.pub-dlg-header {
  text-align: center;
}

.pub-dlg-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
}

.pub-dlg-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: #64748b;
}

.pub-upload-tool {
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

.pub-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .pub-grid {
    grid-template-columns: 1fr;
  }
}

.pub-col-left,
.pub-col-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pub-card {
  background: #fff;
  padding: 22px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
}

.pub-card-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pub-card-title-icon {
  font-size: 18px;
  line-height: 1;
}

.pub-tabs {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 16px;
}

.pub-tab {
  flex: 1;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.pub-tab:hover {
  color: #475569;
}

.pub-tab-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.pub-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pub-el-select {
  width: 100%;
}

.pub-key-opt-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.pub-key-opt-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.35;
}

.pub-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: -6px;
}

.pub-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.pub-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 18%);
}

.pub-hint-muted {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.pub-tip-box {
  background: #eff6ff;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  font-size: 13px;
  color: #1d4ed8;
}

.pub-tip-title {
  margin: 0 0 6px;
  font-weight: 700;
  font-style: italic;
}

.pub-tip-list {
  margin: 0;
  padding-left: 18px;
}

.pub-tip-list li {
  margin-top: 4px;
}

.pub-tip-list code {
  font-size: 12px;
  background: rgb(255 255 255 / 70%);
  padding: 1px 6px;
  border-radius: 4px;
}

.pub-drop-zone {
  border: 2px dashed #e2e8f0;
  border-radius: 14px;
  padding: 36px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f8fafc;
  transition:
    border-color 0.25s,
    background 0.25s;
}

.pub-drop-zone:hover {
  background: #f1f5f9;
}

.pub-drop-zone-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.pub-drop-icon {
  font-size: 42px;
  line-height: 1;
  color: #94a3b8;
  margin-bottom: 12px;
}

.pub-drop-main {
  margin: 0;
  font-weight: 600;
  color: #475569;
  text-align: center;
}

.pub-drop-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.pub-file-input {
  display: none;
}

.pub-file-preview {
  margin-top: 14px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pub-file-preview-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pub-file-doc {
  color: #3b82f6;
  font-size: 18px;
}

.pub-file-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.pub-file-remove {
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  font-size: 16px;
  line-height: 1;
}

.pub-file-remove:hover {
  color: #ef4444;
}

.pub-submit-btn {
  width: 100%;
  margin-top: 18px;
  height: 44px;
  border-radius: 12px;
  font-weight: 600;
}

.pub-status {
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.pub-status-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.pub-status-success {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.pub-status-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.pub-response-wrap {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #1e293b;
  background: #0f172a;
}

.pub-response-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  background: rgb(30 41 59 / 85%);
  border-bottom: 1px solid #1e293b;
}

.pub-response-head-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pub-copy-btn {
  font-size: 12px;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pub-copy-btn:hover {
  color: #fff;
}

.pub-response-body {
  margin: 0;
  padding: 20px;
  font-size: 13px;
  line-height: 1.5;
  color: #60a5fa;
  overflow-x: auto;
  max-height: 280px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #0f172a;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
