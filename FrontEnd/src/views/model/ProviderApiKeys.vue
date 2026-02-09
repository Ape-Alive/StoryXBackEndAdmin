<template>
  <div class="provider-api-keys-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">供应商API Key管理</h1>
        <p class="page-description" v-if="providerInfo">
          管理提供商 "{{ providerInfo.displayName || providerInfo.name }}" 的关联API Key
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        新增API Key
      </el-button>
    </div>

    <!-- 提供商信息卡片 -->
    <div class="provider-info-card" v-if="providerInfo">
      <div class="info-item">
        <span class="label">提供商名称：</span>
        <span class="value">{{ providerInfo.displayName || providerInfo.name }}</span>
      </div>
      <div class="info-item">
        <span class="label">服务地址：</span>
        <span class="value">{{ providerInfo.baseUrl }}</span>
      </div>
      <div class="info-item">
        <span class="label">总额度：</span>
        <span class="value">{{ formatNumber(providerInfo.quota) }} {{ getQuotaUnitLabel(providerInfo.quotaUnit) }}</span>
      </div>
      <div class="info-item">
        <span class="label">支持API Key创建：</span>
        <el-tag :type="providerInfo.supportsApiKeyCreation ? 'success' : 'info'" size="small">
          {{ providerInfo.supportsApiKeyCreation ? '是' : '否' }}
        </el-tag>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
      >
        <el-table-column label="API Key名称" min-width="200">
          <template #default="{ row }">
            <span class="api-key-name">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="API Key ID" min-width="200">
          <template #default="{ row }">
            <span v-if="row.apiKeyId" class="api-key-id">{{ row.apiKeyId }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="额度" width="120" align="right">
          <template #default="{ row }">
            <span v-if="parseFloat(row.credits) === 0" class="quota-unlimited">无限制</span>
            <span v-else class="quota-value">{{ formatNumber(row.credits) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="过期时间" width="160" align="center">
          <template #default="{ row }">
            <span v-if="row.expireTime && parseFloat(row.expireTime) > 0" class="expire-time">
              {{ formatDateTime(row.expireTime) }}
            </span>
            <span v-else class="text-muted">永不过期</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                :icon="Edit"
                circle
                size="small"
                @click="handleEdit(row)"
                :disabled="row.status !== 'active'"
                title="编辑"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="handleDelete(row)"
                title="删除"
              />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div class="pagination-wrapper" v-if="pagination.total > 0">
      <div class="pagination-info">
        共 {{ pagination.total }} 条记录, 当前显示 {{ paginationRange.start }}-{{ paginationRange.end }}
      </div>
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
      <div class="page-size-selector">
        <span>每页行数: </span>
        <el-select v-model="pagination.pageSize" @change="handleSizeChange" style="width: 80px">
          <el-option label="10" :value="10" />
          <el-option label="20" :value="20" />
          <el-option label="50" :value="50" />
          <el-option label="100" :value="100" />
        </el-select>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="formVisible"
      :title="currentApiKey?.id ? '编辑API Key' : '新增API Key'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="formData.apiKey"
            type="textarea"
            :rows="3"
            placeholder="请输入API Key"
            :disabled="!!currentApiKey?.id"
          />
          <div class="form-tip" v-if="currentApiKey?.id">编辑时不能修改API Key</div>
        </el-form-item>

        <el-form-item label="API Key名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入API Key名称"
          />
        </el-form-item>

        <el-form-item label="API Key ID">
          <el-input
            v-model="formData.apiKeyId"
            placeholder="第三方返回的ID（可选）"
          />
        </el-form-item>

        <el-form-item label="额度（积分）">
          <el-input-number
            v-model="formData.credits"
            :min="0"
            :step="100"
            :precision="0"
            placeholder="0表示无限制"
            style="width: 100%"
          />
          <div class="form-tip">0表示无限制，大于0表示该API Key的额度限制</div>
        </el-form-item>

        <el-form-item label="过期时间">
          <el-date-picker
            v-model="formData.expireTime"
            type="datetime"
            placeholder="选择过期时间（可选）"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            clearable
          />
          <div class="form-tip">不选择表示永不过期</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="saving"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getProviderById } from '@/api/provider'
import {
  getProviderApiKeys,
  addProviderApiKey,
  deleteProviderApiKey
} from '@/api/providerApiKey'

const route = useRoute()
const router = useRouter()

const providerId = computed(() => route.params.id)

// 数据
const loading = ref(false)
const tableData = ref([])
const providerInfo = ref(null)
const formVisible = ref(false)
const saving = ref(false)
const currentApiKey = ref(null)
const formRef = ref()

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 计算显示的记录范围
const paginationRange = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return { start, end }
})

const formData = reactive({
  apiKey: '',
  name: '',
  apiKeyId: '',
  credits: 0,
  expireTime: null
})

const rules = {
  apiKey: [
    { required: true, message: '请输入API Key', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入API Key名称', trigger: 'blur' },
    { max: 255, message: '名称长度不能超过255个字符', trigger: 'blur' }
  ]
}

// 获取提供商信息
async function fetchProviderInfo() {
  try {
    const response = await getProviderById(providerId.value)
    if (response.success) {
      providerInfo.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取提供商信息失败')
  }
}

// 获取API Key列表
async function fetchData() {
  loading.value = true
  try {
    // 不传 userId 参数，查询该提供商的所有API Key（包括系统级和用户级）
    const response = await getProviderApiKeys(providerId.value, {
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      } else {
        // 如果没有分页信息，使用数据长度
        pagination.total = tableData.value.length
      }
    }
  } catch (error) {
    ElMessage.error('获取API Key列表失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

// 每页数量变化
function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

// 新增
function handleAdd() {
  currentApiKey.value = null
  Object.assign(formData, {
    apiKey: '',
    name: '',
    apiKeyId: '',
    credits: 0,
    expireTime: null
  })
  formVisible.value = true
}

// 编辑
function handleEdit(row) {
  currentApiKey.value = { ...row }
  Object.assign(formData, {
    apiKey: row.apiKey ? '***' + row.apiKey.slice(-4) : '', // 不显示完整API Key
    name: row.name || '',
    apiKeyId: row.apiKeyId || '',
    credits: parseFloat(row.credits) || 0,
    expireTime: row.expireTime && parseFloat(row.expireTime) > 0
      ? formatTimestampToDateTime(row.expireTime)
      : null
  })
  formVisible.value = true
}

// 删除
function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除API Key "${row.name}" 吗？删除后，该API Key的额度将从提供商总额度中扣除。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const response = await deleteProviderApiKey(providerId.value, row.id)
        if (response.success) {
          ElMessage.success('删除成功')
          fetchData()
          fetchProviderInfo() // 刷新提供商信息（额度可能变化）
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 提交表单
function handleSubmit() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return

    saving.value = true
    try {
      const payload = {
        apiKey: formData.apiKey,
        name: formData.name,
        apiKeyId: formData.apiKeyId || null,
        credits: formData.credits || 0,
        expireTime: formData.expireTime || null
      }

      // 处理过期时间
      if (payload.expireTime) {
        payload.expireTime = Math.floor(new Date(payload.expireTime).getTime() / 1000)
      } else {
        payload.expireTime = 0
      }

      if (currentApiKey.value?.id) {
        // 编辑：需要重新提交完整API Key（这里简化处理，实际应该调用更新接口）
        ElMessage.warning('编辑功能需要重新输入完整API Key，请删除后重新添加')
        formVisible.value = false
      } else {
        // 新增
        const response = await addProviderApiKey(providerId.value, payload)
        if (response.success) {
          ElMessage.success('添加成功')
          formVisible.value = false
          fetchData()
          fetchProviderInfo() // 刷新提供商信息（额度可能变化）
        }
      }
    } catch (error) {
      // 错误已在 request.js 中处理
    } finally {
      saving.value = false
    }
  })
}

// 工具函数
function formatNumber(value) {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

function formatDateTime(value) {
  if (!value) return '-'
  
  // 如果已经是 Date 对象，直接格式化
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return 'Invalid Date'
    }
    return value.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  // 如果是 ISO 字符串格式（如 "2024-01-01T00:00:00.000Z"），直接解析
  if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  // 处理时间戳（可能是数字或字符串）
  let timestamp = value
  if (typeof value === 'string') {
    // 尝试解析字符串为数字
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) {
      timestamp = parsed
    } else {
      // 如果不是数字字符串，尝试直接解析为日期
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }
  
  // 转换为数字
  const timestampNum = typeof timestamp === 'number' ? timestamp : parseFloat(timestamp)
  if (isNaN(timestampNum) || timestampNum <= 0) {
    return 'Invalid Date'
  }
  
  // 判断时间戳长度：秒级时间戳通常是 10 位（小于 10000000000），毫秒级是 13 位
  // expireTime 在数据库中存储的是秒级时间戳，但 createdAt 是 Date 对象
  const date = timestampNum < 10000000000 
    ? new Date(timestampNum * 1000)  // 秒级时间戳，转换为毫秒
    : new Date(timestampNum)          // 毫秒级时间戳
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatTimestampToDateTime(timestamp) {
  if (!timestamp || parseFloat(timestamp) === 0) return null
  const date = new Date(parseFloat(timestamp) * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getQuotaUnitLabel(unit) {
  const unitMap = {
    points: '积分',
    yuan: '元',
    usd: '美元'
  }
  return unitMap[unit] || unit || ''
}

function getTypeTagType(type) {
  const map = {
    system_created: 'success',
    user_created: 'primary',
    provider_associated: 'info'
  }
  return map[type] || 'info'
}

function getTypeLabel(type) {
  const map = {
    system_created: '系统创建',
    user_created: '用户创建',
    provider_associated: '提供商关联'
  }
  return map[type] || type
}

function getStatusTagType(status) {
  const map = {
    active: 'success',
    expired: 'warning',
    revoked: 'danger'
  }
  return map[status] || 'info'
}

function getStatusLabel(status) {
  const map = {
    active: '活跃',
    expired: '已过期',
    revoked: '已撤销'
  }
  return map[status] || status
}

onMounted(() => {
  fetchProviderInfo()
  fetchData()
})
</script>

<style scoped>
.provider-api-keys-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 8px 0 0 0;
}

.page-description {
  font-size: 14px;
  color: #64748b;
  margin: 8px 0 0 0;
}

.provider-info-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item .label {
  font-size: 14px;
  color: #64748b;
}

.info-item .value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.table-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.pagination-info {
  font-size: 14px;
  color: #64748b;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
}

.api-key-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.api-key-id {
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #64748b;
}

.quota-unlimited {
  color: #10b981;
  font-weight: 600;
}

.quota-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.expire-time {
  font-size: 13px;
  color: #64748b;
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.text-muted {
  color: #94a3b8;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
