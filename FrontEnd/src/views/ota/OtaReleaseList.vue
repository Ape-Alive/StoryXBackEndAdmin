<template>
  <div class="ota-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">OTA 发布管理</h1>
        <p class="page-description">管理 Shell / Backend / Frontend 三层 OTA 发布包。</p>
      </div>
      <div class="header-actions">
        <el-button @click="openShaDialog({ fillForm: formVisible })">计算 SHA256</el-button>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新建发布</el-button>
      </div>
    </div>

    <div class="filter-section">
      <el-select v-model="filters.layer" placeholder="层级" clearable style="width: 140px">
        <el-option v-for="item in meta.layers" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.channel" placeholder="渠道" clearable style="width: 130px">
        <el-option v-for="item in meta.channels" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.isPublished" placeholder="发布状态" clearable style="width: 130px">
        <el-option label="已发布" :value="true" />
        <el-option label="未发布" :value="false" />
      </el-select>
      <el-input v-model="filters.keyword" placeholder="搜索版本号" clearable style="width: 180px" @keyup.enter="handleSearch" />
      <el-button @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" row-key="id" style="width: 100%">
      <el-table-column prop="layer" label="层级" width="90" />
      <el-table-column prop="platform" label="平台" width="110" />
      <el-table-column prop="bundleType" label="包类型" width="90">
        <template #default="{ row }">{{ row.bundleType || '-' }}</template>
      </el-table-column>
      <el-table-column prop="version" label="版本" width="100" />
      <el-table-column prop="buildNumber" label="Build" width="80" align="center" />
      <el-table-column prop="channel" label="渠道" width="90" />
      <el-table-column label="大小" width="100">
        <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="publishStatusType(row)" size="small">
            {{ publishStatusLabel(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="定向/灰度" min-width="120">
        <template #default="{ row }">
          <span v-if="row.targetDeviceIds?.length">设备 {{ row.targetDeviceIds.length }} 台</span>
          <span v-else>灰度 {{ row.rolloutPercent ?? 100 }}%</span>
          <div v-if="row.forceUpdate" class="force-flag">强制</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">
            {{ row.isPublished ? '查看' : '编辑' }}
          </el-button>
          <el-button v-if="!row.isPublished" type="success" link @click="handlePublish(row)">发布</el-button>
          <el-button v-else type="warning" link @click="handleUnpublish(row)">下线</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog
      v-model="formVisible"
      :title="dialogTitle"
      width="760px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-alert
        v-if="isPublishedReadonly"
        type="warning"
        :closable="false"
        show-icon
        class="published-alert"
        title="当前版本已上线，仅可查看，不可修改"
        description="如需修改 URL、SHA256、灰度或文案等，请先在列表中点击「下线」，修改完成后再重新「发布」。"
      />
      <el-form
        ref="formRef"
        :model="formData"
        :rules="isPublishedReadonly ? {} : formRules"
        label-width="130px"
        :disabled="isPublishedReadonly"
      >
        <el-form-item label="层级" prop="layer">
          <el-select v-model="formData.layer" :disabled="isPublishedReadonly || !!formData.id" style="width: 100%" @change="onLayerChange">
            <el-option v-for="item in meta.layers" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="formData.layer === 'shell' || (formData.layer === 'backend' && formData.bundleType === 'full')" label="平台" prop="platform">
          <el-select v-model="formData.platform" style="width: 100%">
            <el-option v-for="p in shellPlatforms" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="formData.layer === 'backend'" label="包类型" prop="bundleType">
          <el-select v-model="formData.bundleType" :disabled="isPublishedReadonly || !!formData.id" style="width: 100%" @change="onBundleTypeChange">
            <el-option label="patch" value="patch" />
            <el-option label="full" value="full" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="formData.layer === 'shell'" label="更新方式" prop="updateMethod">
          <el-select v-model="formData.updateMethod" style="width: 100%">
            <el-option v-for="m in availableUpdateMethods" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="formData.channel" style="width: 100%">
            <el-option v-for="item in meta.channels" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号" prop="version">
          <el-input v-model="formData.version" placeholder="如 1.2.4" />
        </el-form-item>
        <el-form-item label="Build 号" prop="buildNumber">
          <el-input-number v-model="formData.buildNumber" :min="1" :disabled="isPublishedReadonly || !!formData.id" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="formData.layer === 'backend' && formData.bundleType === 'patch'" label="最小 Base Build" prop="minBaseBuild">
          <el-input-number v-model="formData.minBaseBuild" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="formData.layer === 'frontend'" label="最小 Backend Build" prop="minBackendBuild">
          <el-input-number v-model="formData.minBackendBuild" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="下载 URL" prop="downloadUrl">
          <div class="upload-row">
            <el-input v-model="formData.downloadUrl" type="textarea" :rows="2" />
            <el-upload
              v-if="!isPublishedReadonly"
              :show-file-list="false"
              :http-request="handleArtifactUpload"
              accept=".zip,.dmg,.exe,.yml"
            >
              <el-button :loading="uploading">上传产物</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item v-if="formData.layer === 'shell' && formData.updateMethod === 'auto_install'" label="Feed URL" prop="feedUrl">
          <el-input v-model="formData.feedUrl" />
        </el-form-item>
        <el-form-item label="SHA256" prop="sha256">
          <div class="sha-row">
            <el-input v-model="formData.sha256" placeholder="64 位 hex，或点击计算" />
            <el-button v-if="!isPublishedReadonly" @click="openShaDialog({ fillForm: true })">计算</el-button>
          </div>
        </el-form-item>
        <el-form-item label="文件大小(字节)" prop="fileSize">
          <el-input-number v-model="formData.fileSize" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="灰度比例(%)" prop="rolloutPercent">
          <el-input-number v-model="formData.rolloutPercent" :min="0" :max="100" style="width: 100%" />
          <div class="form-tip">未指定设备时按 deviceId 哈希灰度；指定设备后仅名单内设备可见，再叠加该比例。</div>
        </el-form-item>
        <el-form-item label="指定设备">
          <el-select
            v-model="formData.targetDeviceIds"
            multiple
            filterable
            remote
            reserve-keyword
            clearable
            collapse-tags
            collapse-tags-tooltip
            placeholder="搜索设备指纹选择（可选）"
            :remote-method="searchDevices"
            :loading="deviceSearching"
            style="width: 100%; margin-bottom: 8px"
          >
            <el-option
              v-for="d in deviceOptions"
              :key="d.deviceFingerprint"
              :label="deviceOptionLabel(d)"
              :value="d.deviceFingerprint"
            />
          </el-select>
          <el-input
            v-model="targetDeviceIdsText"
            type="textarea"
            :rows="3"
            placeholder="也可手动粘贴 deviceId / 设备指纹，每行一个（与客户端 check 的 deviceId 一致）"
            @blur="syncTargetDeviceIdsFromText"
          />
          <div class="form-tip">留空则按灰度比例对所有设备生效；填写后仅这些设备可拉取该版本。</div>
        </el-form-item>
        <el-form-item label="强制更新">
          <el-switch v-model="formData.forceUpdate" />
          <div class="form-tip">开启后客户端弹窗不可关闭、不可「稍后」，只能点击升级。</div>
        </el-form-item>
        <el-form-item label="更新说明">
          <el-input v-model="formData.releaseNotes" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">{{ isPublishedReadonly ? '关闭' : '取消' }}</el-button>
        <el-button
          v-if="isPublishedReadonly"
          type="warning"
          @click="handleUnpublishFromDialog"
        >
          下线后编辑
        </el-button>
        <el-button
          v-else
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="publishDialogVisible"
      title="发布 OTA 版本"
      width="480px"
      destroy-on-close
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="published-alert"
        :title="publishTargetHint"
      />
      <el-form label-width="110px" style="margin-top: 16px">
        <el-form-item label="生效方式">
          <el-radio-group v-model="publishForm.mode">
            <el-radio label="immediate">立即升级（立刻对客户端生效）</el-radio>
            <el-radio label="scheduled">定时生效</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="publishForm.mode === 'scheduled'" label="生效时间">
          <el-date-picker
            v-model="publishForm.publishAt"
            type="datetime"
            placeholder="选择生效时间"
            value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
            :disabled-date="disablePastDate"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="confirmPublish">确认发布</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="shaDialogVisible"
      title="计算 SHA256"
      width="560px"
      destroy-on-close
      @closed="resetShaDialog"
    >
      <p class="sha-hint">选择本地产物文件，在浏览器内计算 SHA256（不会上传）。大文件可能需要一些时间。</p>
      <el-upload
        drag
        :auto-upload="false"
        :show-file-list="false"
        :on-change="onShaFileChange"
        accept=".zip,.dmg,.exe,.yml,.blockmap"
      >
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击选择</em>
        </div>
      </el-upload>

      <div v-if="shaResult.fileName" class="sha-result">
        <div class="sha-result-row">
          <span class="sha-label">文件</span>
          <span>{{ shaResult.fileName }}</span>
        </div>
        <div class="sha-result-row">
          <span class="sha-label">大小</span>
          <span>{{ formatSize(shaResult.fileSize) }}（{{ shaResult.fileSize }} 字节）</span>
        </div>
        <div class="sha-result-row">
          <span class="sha-label">SHA256</span>
          <el-input
            v-model="shaResult.sha256"
            type="textarea"
            :rows="2"
            readonly
            :placeholder="shaComputing ? '计算中…' : ''"
          />
        </div>
        <el-progress
          v-if="shaComputing"
          :percentage="shaProgress"
          :stroke-width="6"
          style="margin-top: 12px"
        />
      </div>

      <template #footer>
        <el-button @click="shaDialogVisible = false">关闭</el-button>
        <el-button :disabled="!shaResult.sha256" @click="copySha256">复制 SHA256</el-button>
        <el-button
          v-if="shaFillForm"
          type="primary"
          :disabled="!shaResult.sha256"
          @click="applyShaToForm"
        >
          填入表单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getOtaReleaseMeta,
  getOtaReleaseList,
  createOtaRelease,
  updateOtaRelease,
  publishOtaRelease,
  unpublishOtaRelease,
  deleteOtaRelease,
  uploadOtaArtifact
} from '@/api/otaRelease'
import { getDevices } from '@/api/device'

const loading = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const publishing = ref(false)
const formVisible = ref(false)
const publishDialogVisible = ref(false)
const formRef = ref(null)
const tableData = ref([])
const meta = reactive({ layers: [], channels: [], platforms: [], bundleTypes: {}, updateMethods: {} })

const shaDialogVisible = ref(false)
const shaFillForm = ref(false)
const shaComputing = ref(false)
const shaProgress = ref(0)
const shaResult = reactive({ fileName: '', fileSize: 0, sha256: '' })

const deviceSearching = ref(false)
const deviceOptions = ref([])
const targetDeviceIdsText = ref('')
const publishTargetRow = ref(null)
const publishForm = reactive({
  mode: 'immediate',
  publishAt: '',
})

const filters = reactive({ layer: '', channel: '', isPublished: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = () => ({
  id: '',
  layer: 'backend',
  platform: 'darwin-arm64',
  bundleType: 'patch',
  updateMethod: 'manual_download',
  channel: 'stable',
  version: '',
  buildNumber: 1000,
  minBaseBuild: null,
  minBackendBuild: null,
  downloadUrl: '',
  feedUrl: '',
  sha256: '',
  fileSize: 1,
  rolloutPercent: 100,
  forceUpdate: false,
  releaseNotes: '',
  isPublished: false,
  targetDeviceIds: [],
})

const formData = reactive(defaultForm())

const isPublishedReadonly = computed(() => !!(formData.id && formData.isPublished))

const dialogTitle = computed(() => {
  if (!formData.id) return '新建 OTA 发布'
  if (!formData.isPublished) return '编辑 OTA 发布'
  if (formData.publishStatus === 'scheduled') return '查看 OTA 发布（已定时）'
  return '查看 OTA 发布（已上线）'
})

const publishTargetHint = computed(() => {
  const row = publishTargetRow.value
  if (!row) return '确认发布方式'
  const parts = [`版本 ${row.version} · build ${row.buildNumber}`]
  if (row.targetDeviceIds?.length) parts.push(`定向 ${row.targetDeviceIds.length} 台设备`)
  else parts.push(`灰度 ${row.rolloutPercent ?? 100}%`)
  if (row.forceUpdate) parts.push('强制更新')
  return parts.join(' · ')
})

const shellPlatforms = computed(() => meta.platforms.filter(p => p.value !== 'all').map(p => p.value))

const availableUpdateMethods = computed(() => {
  const p = formData.platform || ''
  if (p.startsWith('darwin')) return ['manual_download', 'in_app_download']
  if (p.startsWith('win32')) return ['auto_install', 'manual_download', 'in_app_download']
  return ['manual_download', 'in_app_download']
})

function getApiErrorMessage(error, fallback = '操作失败') {
  const msg =
    error?.response?.data?.message ||
    error?.message ||
    fallback
  if (/Published release cannot be edited/i.test(msg)) {
    return '已发布版本不可直接编辑，请先下线后再修改'
  }
  return msg
}

const formRules = {
  layer: [{ required: true, message: '请选择层级', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  buildNumber: [{ required: true, message: '请输入 Build 号', trigger: 'blur' }],
  downloadUrl: [{ required: true, message: '请输入下载 URL', trigger: 'blur' }],
  sha256: [{ required: true, message: '请输入 SHA256', trigger: 'blur' }],
  fileSize: [{ required: true, message: '请输入文件大小', trigger: 'blur' }]
}

function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function publishStatusLabel(row) {
  if (row.publishStatus === 'scheduled') return '定时生效'
  if (row.publishStatus === 'live' || row.isPublished) return '已上线'
  return '草稿'
}

function publishStatusType(row) {
  if (row.publishStatus === 'scheduled') return 'warning'
  if (row.publishStatus === 'live' || row.isPublished) return 'success'
  return 'info'
}

function deviceOptionLabel(d) {
  const name = d.name || d.remark || '设备'
  const email = d.user?.email ? ` · ${d.user.email}` : ''
  return `${name}${email} · ${d.deviceFingerprint}`
}

function syncTargetDeviceIdsText() {
  targetDeviceIdsText.value = (formData.targetDeviceIds || []).join('\n')
}

function syncTargetDeviceIdsFromText() {
  const fromText = String(targetDeviceIdsText.value || '')
    .split(/[\n,，\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
  const merged = [...new Set([...(formData.targetDeviceIds || []), ...fromText])]
  formData.targetDeviceIds = merged
  syncTargetDeviceIdsText()
}

async function searchDevices(keyword) {
  deviceSearching.value = true
  try {
    const res = await getDevices({
      page: 1,
      pageSize: 30,
      deviceFingerprint: keyword || undefined,
      keyword: keyword || undefined,
    })
    deviceOptions.value = res.data || []
  } catch {
    deviceOptions.value = []
  } finally {
    deviceSearching.value = false
  }
}

function disablePastDate(date) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

async function loadMeta() {
  const res = await getOtaReleaseMeta()
  Object.assign(meta, res.data || {})
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k]
    })
    const res = await getOtaReleaseList(params)
    tableData.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadList()
}

function handleReset() {
  filters.layer = ''
  filters.channel = ''
  filters.isPublished = ''
  filters.keyword = ''
  handleSearch()
}

function handlePageChange(page) {
  pagination.page = page
  loadList()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadList()
}

function onLayerChange() {
  if (formData.layer === 'frontend') {
    formData.platform = 'all'
    formData.bundleType = 'dist'
  } else if (formData.layer === 'backend') {
    formData.bundleType = 'patch'
    formData.platform = 'all'
  } else {
    formData.platform = 'darwin-arm64'
    formData.updateMethod = 'manual_download'
  }
}

function onBundleTypeChange() {
  if (formData.bundleType === 'patch') {
    formData.platform = 'all'
  } else {
    formData.platform = 'darwin-arm64'
  }
}

function resetForm() {
  Object.assign(formData, defaultForm())
  targetDeviceIdsText.value = ''
  deviceOptions.value = []
}

function handleAdd() {
  resetForm()
  formVisible.value = true
}

function handleEdit(row) {
  const targetDeviceIds = Array.isArray(row.targetDeviceIds)
    ? [...row.targetDeviceIds]
    : []
  Object.assign(formData, {
    ...defaultForm(),
    ...row,
    minBaseBuild: row.minBaseBuild ?? null,
    minBackendBuild: row.minBackendBuild ?? null,
    isPublished: !!row.isPublished,
    targetDeviceIds,
  })
  syncTargetDeviceIdsText()
  if (targetDeviceIds.length) {
    deviceOptions.value = targetDeviceIds.map(fp => ({
      deviceFingerprint: fp,
      name: fp.slice(0, 16),
    }))
  }
  formVisible.value = true
}

function openShaDialog({ fillForm = false } = {}) {
  shaFillForm.value = !!fillForm
  resetShaDialog()
  shaDialogVisible.value = true
}

function resetShaDialog() {
  shaComputing.value = false
  shaProgress.value = 0
  shaResult.fileName = ''
  shaResult.fileSize = 0
  shaResult.sha256 = ''
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function computeFileSha256(file) {
  if (!window.crypto?.subtle) {
    throw new Error('当前浏览器不支持 Web Crypto，无法计算 SHA256')
  }
  const CHUNK = 4 * 1024 * 1024
  // SubtleCrypto 不支持流式，大文件分片读入后仍需整包 digest；分片只用于进度展示
  const chunks = []
  let offset = 0
  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK)
    // eslint-disable-next-line no-await-in-loop
    const buf = await slice.arrayBuffer()
    chunks.push(new Uint8Array(buf))
    offset += CHUNK
    shaProgress.value = Math.min(99, Math.round((offset / file.size) * 100))
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const merged = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) {
    merged.set(c, pos)
    pos += c.length
  }
  const digest = await window.crypto.subtle.digest('SHA-256', merged)
  shaProgress.value = 100
  return bufferToHex(digest)
}

async function onShaFileChange(uploadFile) {
  const file = uploadFile?.raw
  if (!file) return

  shaResult.fileName = file.name
  shaResult.fileSize = file.size
  shaResult.sha256 = ''
  shaComputing.value = true
  shaProgress.value = 0

  try {
    shaResult.sha256 = await computeFileSha256(file)
    ElMessage.success('SHA256 计算完成')
  } catch (e) {
    ElMessage.error(e.message || '计算失败')
    shaResult.sha256 = ''
  } finally {
    shaComputing.value = false
  }
}

async function copySha256() {
  if (!shaResult.sha256) return
  try {
    await navigator.clipboard.writeText(shaResult.sha256)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动选择文本复制')
  }
}

function applyShaToForm() {
  if (!shaResult.sha256) return
  formData.sha256 = shaResult.sha256
  formData.fileSize = shaResult.fileSize || formData.fileSize
  shaDialogVisible.value = false
  ElMessage.success('已填入 SHA256 与文件大小')
}

async function handleArtifactUpload(options) {
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    fd.append('layer', formData.layer)
    fd.append('buildNumber', String(formData.buildNumber || ''))
    const res = await uploadOtaArtifact(fd)
    const data = res.data || res
    formData.downloadUrl = data.downloadUrl || formData.downloadUrl
    formData.sha256 = data.sha256 || formData.sha256
    formData.fileSize = data.fileSize || formData.fileSize
    ElMessage.success('产物上传成功，已回填 URL / SHA256')
    options.onSuccess?.(data)
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
    options.onError?.(e)
  } finally {
    uploading.value = false
  }
}

async function handleSubmit() {
  if (isPublishedReadonly.value) {
    ElMessage.warning('已发布版本不可直接编辑，请先下线后再修改')
    return
  }
  syncTargetDeviceIdsFromText()
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = { ...formData }
    delete payload.id
    delete payload.isPublished
    delete payload.publishStatus
    delete payload.publishedAt
    delete payload.publishAt
    payload.targetDeviceIds = [...(formData.targetDeviceIds || [])]
    if (formData.id) {
      await updateOtaRelease(formData.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createOtaRelease(payload)
      ElMessage.success('创建成功')
    }
    formVisible.value = false
    loadList()
  } catch (e) {
    // 接口层拦截器已提示；此处仅兜底无网络等无 response 场景
    if (!e?.response) {
      ElMessage.error(getApiErrorMessage(e, '保存失败'))
    }
  } finally {
    submitting.value = false
  }
}

function handlePublish(row) {
  publishTargetRow.value = row
  publishForm.mode = 'immediate'
  publishForm.publishAt = ''
  publishDialogVisible.value = true
}

async function confirmPublish() {
  const row = publishTargetRow.value
  if (!row?.id) return
  if (publishForm.mode === 'scheduled' && !publishForm.publishAt) {
    ElMessage.warning('请选择定时生效时间')
    return
  }
  publishing.value = true
  try {
    const body = { mode: publishForm.mode }
    if (publishForm.mode === 'scheduled') {
      body.publishAt = new Date(publishForm.publishAt).toISOString()
    }
    await publishOtaRelease(row.id, body)
    ElMessage.success(publishForm.mode === 'scheduled' ? '已设置定时生效' : '已立即发布')
    publishDialogVisible.value = false
    loadList()
  } catch (e) {
    if (!e?.response) {
      ElMessage.error(getApiErrorMessage(e, '发布失败'))
    }
  } finally {
    publishing.value = false
  }
}

async function handleUnpublish(row) {
  try {
    await ElMessageBox.confirm(
      '确认下线该版本？下线后客户端将无法再拉取该更新；下线后才可编辑。',
      '提示',
      { type: 'warning' },
    )
    await unpublishOtaRelease(row.id)
    ElMessage.success('已下线，现在可以编辑该版本')
    loadList()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(getApiErrorMessage(e, '下线失败'))
  }
}

async function handleUnpublishFromDialog() {
  if (!formData.id) return
  try {
    await ElMessageBox.confirm(
      '确认下线该版本？下线后将可在本页编辑；修改完成后请再点击「发布」。',
      '下线后编辑',
      { type: 'warning', confirmButtonText: '确认下线' },
    )
    await unpublishOtaRelease(formData.id)
    formData.isPublished = false
    ElMessage.success('已下线，现在可以编辑')
    loadList()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(getApiErrorMessage(e, '下线失败'))
  }
}

async function handleDelete(row) {
  try {
    if (row.isPublished) {
      await ElMessageBox.confirm(
        '该版本当前为已发布状态。建议先下线再删除；确认仍要删除吗？',
        '警告',
        { type: 'warning' },
      )
    } else {
      await ElMessageBox.confirm('确认删除该记录？', '警告', { type: 'warning' })
    }
    await deleteOtaRelease(row.id)
    ElMessage.success('已删除')
    loadList()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(getApiErrorMessage(e, '删除失败'))
  }
}

onMounted(async () => {
  await loadMeta()
  await loadList()
})
</script>

<style scoped>
.ota-page {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.page-title {
  margin: 0 0 8px;
  font-size: 22px;
}
.page-description {
  margin: 0;
  color: #666;
}
.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.upload-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.published-alert {
  margin-bottom: 16px;
}
.form-tip {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}
.force-flag {
  color: #e6a23c;
  font-size: 12px;
  margin-top: 2px;
}
.sha-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.sha-hint {
  margin: 0 0 12px;
  color: #666;
  font-size: 13px;
  line-height: 1.5;
}
.sha-result {
  margin-top: 16px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 6px;
}
.sha-result-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  align-items: flex-start;
  word-break: break-all;
}
.sha-result-row:last-child {
  margin-bottom: 0;
}
.sha-label {
  flex: 0 0 64px;
  color: #666;
  font-size: 13px;
  line-height: 32px;
}
</style>
