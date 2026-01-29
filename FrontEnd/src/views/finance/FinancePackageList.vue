<template>
  <div class="package-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">商业套餐定义</h1>
        <p class="page-description">
          配置面向终端用户售卖的商业套餐，包括额度、有效期、价格、最大设备数等关键参数。
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        新增套餐
      </el-button>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <div class="package-filter">
        <el-input
          v-model="filters.name"
          placeholder="按套餐名称搜索..."
          clearable
          class="filter-input"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.type"
          placeholder="套餐类型"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="全部类型" :value="''" />
          <el-option label="免费套餐" value="free" />
          <el-option label="付费套餐" value="paid" />
          <el-option label="试用套餐" value="trial" />
        </el-select>
        <el-select
          v-model="filters.isActive"
          placeholder="启用状态"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="全部" :value="''" />
          <el-option label="已启用" :value="true" />
          <el-option label="未启用" :value="false" />
        </el-select>
      </div>

      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">已启用: {{ statistics.active }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <div class="package-table">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="selected-info" v-if="selectedIds.length">
            已选择 {{ selectedIds.length }} 项
          </span>
        </div>
        <div class="toolbar-right">
          <el-dropdown v-if="selectedIds.length" trigger="click">
            <el-button type="primary" text>
              批量操作
              <el-icon class="el-icon--right">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleBatchStatus(true)">
                  批量启用
                </el-dropdown-item>
                <el-dropdown-item @click="handleBatchStatus(false)">
                  批量停用
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleBatchDelete">
                  <span style="color: #ef4444">批量删除</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" fixed="left" />

        <el-table-column label="套餐信息" min-width="220" fixed="left">
          <template #default="{ row }">
            <div class="package-info">
              <div class="package-avatar" :style="{ backgroundColor: getAvatarColor(row.name) }">
                {{ getAvatarText(row.name) }}
              </div>
              <div class="package-details">
                <div class="package-name">{{ row.displayName || row.name }}</div>
                <div class="package-subtitle">{{ row.name }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="额度" width="140" align="center">
          <template #default="{ row }">
            <div class="quota-display">
              <span v-if="row.quota !== null && row.quota !== undefined" class="quota-value">
                {{ formatDecimal(row.quota) }}
              </span>
              <span v-else class="quota-empty">无限</span>
              <span class="quota-unit">积分</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="价格" width="140" align="center">
          <template #default="{ row }">
            <div class="price-display">
              <span v-if="row.price !== null && row.price !== undefined" class="price-value">
                {{ formatDecimal(row.price) }}
              </span>
              <span v-else class="price-empty">-</span>
              <span v-if="row.priceUnit" class="price-unit">{{ row.priceUnit }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="折扣" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.discount !== null && row.discount !== undefined">
              {{ formatDecimal(row.discount) }}%
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="最大设备数" width="120" align="center">
          <template #default="{ row }">
            <span>{{ row.maxDevices ?? '无限' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="优先级" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.priority }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <div :class="['status-badge', row.isActive ? 'status-enabled' : 'status-disabled']">
              <el-icon class="status-icon">
                <component :is="row.isActive ? 'CircleCheck' : 'CircleClose'" />
              </el-icon>
              <span class="status-text">{{ row.isActive ? '已启用' : '已停用' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="180" align="center">
          <template #default="{ row }">
            <span class="create-time">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="250" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                text
                size="small"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                type="primary"
                text
                size="small"
                @click="handleDuplicate(row)"
              >
                复制
              </el-button>
              <el-button
                type="primary"
                text
                size="small"
                @click="toggleStatus(row)"
              >
                {{ row.isActive ? '停用' : '启用' }}
              </el-button>
              <el-button
                type="danger"
                text
                size="small"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div class="pagination-wrapper">
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

    <!-- 新增/编辑套餐对话框 -->
    <el-dialog
      v-model="formVisible"
      :title="currentPackage?.id ? '编辑套餐' : '新增套餐'"
      width="640px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="内部标识" prop="name" v-if="!currentPackage?.id">
          <el-input
            v-model="formData.name"
            placeholder="例如：premium_monthly"
          />
          <div class="form-tip">创建后不可修改，仅在系统内部使用，需唯一。</div>
        </el-form-item>

        <el-form-item label="显示名称" prop="displayName">
          <el-input
            v-model="formData.displayName"
            placeholder="例如：高级套餐（月付）"
          />
        </el-form-item>

        <el-form-item label="套餐类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择套餐类型" style="width: 100%">
            <el-option label="免费套餐" value="free" />
            <el-option label="付费套餐" value="paid" />
            <el-option label="试用套餐" value="trial" />
          </el-select>
        </el-form-item>

        <el-form-item label="有效期（天）">
          <el-input-number
            v-model="formData.duration"
            :min="1"
            :max="3650"
            placeholder="为空表示永久"
          />
        </el-form-item>

        <el-form-item label="额度（积分）">
          <el-input-number
            v-model="formData.quota"
            :min="0"
            :step="100"
            :precision="0"
            placeholder="为空表示无限"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="价格" v-if="formData.type === 'paid'">
          <div class="price-row">
            <el-input-number
              v-model="formData.price"
              :min="0"
              :step="1"
              :precision="2"
              placeholder="套餐金额"
            />
            <el-select
              v-model="formData.priceUnit"
              placeholder="货币单位"
              style="width: 120px"
            >
              <el-option label="CNY" value="CNY" />
              <el-option label="USD" value="USD" />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="折扣">
          <el-input-number
            v-model="formData.discount"
            :min="0"
            :max="100"
            :precision="2"
            :step="1"
            placeholder="0-100，单位 %"
          />
        </el-form-item>

        <el-form-item label="最大设备数">
          <el-input-number
            v-model="formData.maxDevices"
            :min="0"
            :max="9999"
            placeholder="为空表示无限"
          />
        </el-form-item>

        <el-form-item label="是否可叠加">
          <el-switch v-model="formData.isStackable" />
        </el-form-item>

        <el-form-item label="优先级">
          <el-input-number
            v-model="formData.priority"
            :min="0"
            :max="1000"
          />
          <div class="form-tip">数字越大优先级越高，用于计算额度和设备限制时的生效顺序。</div>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="formData.isActive" />
        </el-form-item>

        <el-form-item label="套餐描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="用于说明套餐权益、适用人群等信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, ArrowDown, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  duplicatePackage,
  updatePackageStatus,
  batchUpdatePackageStatus,
  batchDeletePackages
} from '@/api/package'

// 数据
const loading = ref(false)
const tableData = ref([])
const selectedIds = ref([])

// 筛选条件
const filters = reactive({
  name: '',
  type: '',
  isActive: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 统计信息
const statistics = computed(() => {
  const total = pagination.total
  const active = tableData.value.filter(item => item.isActive).length
  return { total, active }
})

// 计算显示范围
const paginationRange = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return { start, end }
})

// 表单
const formVisible = ref(false)
const saving = ref(false)
const currentPackage = ref(null)
const formRef = ref()

const formData = reactive({
  id: null,
  name: '',
  displayName: '',
  description: '',
  type: 'paid',
  duration: null,
  quota: null,
  price: null,
  priceUnit: 'CNY',
  discount: null,
  maxDevices: null,
  availableModels: null,
  isStackable: false,
  priority: 0,
  isActive: true
})

const rules = {
  name: [
    { required: true, message: '请输入内部标识', trigger: 'blur' },
    { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  displayName: [
    { required: true, message: '请输入显示名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择套餐类型', trigger: 'change' }
  ]
}

// 获取列表
async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: filters.name || undefined,
      type: filters.type || undefined
    }
    if (filters.isActive !== '') {
      params.isActive = filters.isActive
    }

    const res = await getPackages(params)
    if (res.success) {
      tableData.value = res.data || []
      if (res.pagination) {
        pagination.total = res.pagination.total || 0
        pagination.page = res.pagination.page || 1
        pagination.pageSize = res.pagination.pageSize || 20
      }
    }
  } catch (e) {
    ElMessage.error('获取套餐列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 分页
function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

// 多选
function handleSelectionChange(selection) {
  selectedIds.value = selection.map(item => item.id)
}

// 新增
function handleAdd() {
  currentPackage.value = null
  Object.assign(formData, {
    id: null,
    name: '',
    displayName: '',
    description: '',
    type: 'paid',
    duration: null,
    quota: null,
    price: null,
    priceUnit: 'CNY',
    discount: null,
    maxDevices: null,
    availableModels: null,
    isStackable: false,
    priority: 0,
    isActive: true
  })
  formVisible.value = true
}

// 编辑
function handleEdit(row) {
  currentPackage.value = { ...row }
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    type: row.type,
    duration: row.duration,
    quota: row.quota,
    price: row.price,
    priceUnit: row.priceUnit || 'CNY',
    discount: row.discount,
    maxDevices: row.maxDevices,
    availableModels: row.availableModels,
    isStackable: row.isStackable,
    priority: row.priority,
    isActive: row.isActive
  })
  formVisible.value = true
}

// 复制
async function handleDuplicate(row) {
  const newName = `${row.name}_copy`
  const newDisplayName = `${row.displayName || row.name}（复制）`
  try {
    await duplicatePackage(row.id, {
      newName,
      newDisplayName
    })
    ElMessage.success('复制套餐成功')
    fetchData()
  } catch (e) {
    // 统一错误处理
  }
}

// 切换状态
async function toggleStatus(row) {
  try {
    await updatePackageStatus(row.id, !row.isActive)
    ElMessage.success(row.isActive ? '套餐已停用' : '套餐已启用')
    fetchData()
  } catch (e) {
    // 统一处理
  }
}

// 删除
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除套餐「${row.displayName || row.name}」吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    await deletePackage(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    // 统一处理
  }
}

// 批量状态
async function handleBatchStatus(isActive) {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择套餐')
    return
  }
  try {
    await batchUpdatePackageStatus({
      ids: selectedIds.value,
      isActive
    })
    ElMessage.success('批量更新套餐状态成功')
    fetchData()
  } catch (e) {
    // 统一处理
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择套餐')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个套餐吗？`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    await batchDeletePackages({ ids: selectedIds.value })
    ElMessage.success('批量删除套餐成功')
    selectedIds.value = []
    fetchData()
  } catch (e) {
    // 统一处理
  }
}

// 提交表单
function handleSubmit() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload = { ...formData }

      // 清理数据格式，确保符合后端验证规则
      // duration: null/undefined/0 表示永久，传 null
      if (!payload.duration || payload.duration === 0) {
        payload.duration = null
      } else {
        payload.duration = parseInt(payload.duration)
      }

      // quota: null/undefined/0 表示无限，传 null
      if (!payload.quota || payload.quota === 0) {
        payload.quota = null
      } else {
        payload.quota = parseFloat(payload.quota)
      }

      // maxDevices: null/undefined/0 表示无限，传 null
      if (!payload.maxDevices || payload.maxDevices === 0) {
        payload.maxDevices = null
      } else {
        payload.maxDevices = parseInt(payload.maxDevices)
      }

      // 确保 boolean 类型
      payload.isStackable = Boolean(payload.isStackable)
      payload.isActive = Boolean(payload.isActive)

      // priority 确保是整数
      if (payload.priority !== undefined && payload.priority !== null) {
        payload.priority = parseInt(payload.priority)
      }

      // 根据类型处理价格必填
      if (payload.type !== 'paid') {
        payload.price = null
        payload.priceUnit = null
        payload.discount = null
      } else {
        // 付费套餐，确保 price 是数字或 null
        if (payload.price !== undefined && payload.price !== null && payload.price !== '') {
          payload.price = parseFloat(payload.price)
        } else {
          payload.price = null
        }
      }

      // availableModels: 如果是空数组或 null，传 null
      if (!payload.availableModels || (Array.isArray(payload.availableModels) && payload.availableModels.length === 0)) {
        payload.availableModels = null
      }

      // 清理空字符串和 undefined（但保留 null）
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === undefined) {
          delete payload[key]
        }
      })

      if (!payload.id) {
        await createPackage(payload)
        ElMessage.success('创建套餐成功')
      } else {
        const id = payload.id
        delete payload.id
        delete payload.name // name 不允许修改
        await updatePackage(id, payload)
        ElMessage.success('更新套餐成功')
      }
      formVisible.value = false
      fetchData()
    } catch (e) {
      // 统一处理
    } finally {
      saving.value = false
    }
  })
}

// 工具函数
function getAvatarText(name) {
  if (!name) return 'PK'
  return name.substring(0, 2).toUpperCase()
}

function getAvatarColor(name) {
  const colors = ['#8b5cf6', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899']
  const str = name || ''
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getTypeTagType(type) {
  const map = {
    free: 'success',
    paid: 'warning',
    trial: 'info'
  }
  return map[type] || 'info'
}

function getTypeLabel(type) {
  const map = {
    free: '免费',
    paid: '付费',
    trial: '试用'
  }
  return map[type] || type
}

function formatDecimal(value) {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (Number.isNaN(num)) return '-'
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.package-page {
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
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.package-filter {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  align-items: center;
}

.filter-input {
  width: 220px;
}

.filter-select {
  width: 150px;
}

.statistics {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #64748b;
}

.stat-item {
  font-weight: 500;
}

.package-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.selected-info {
  font-size: 13px;
  color: #64748b;
}

.package-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.package-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.package-details {
  flex: 1;
  min-width: 0;
}

.package-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.package-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.quota-display,
.price-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.quota-unit,
.price-unit {
  font-size: 12px;
  color: #94a3b8;
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

.action-buttons {
  display: flex;
  justify-content: center;
  /* gap: 8px; */
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid;
  background: white;
  font-size: 13px;
  font-weight: 500;
}

.status-enabled {
  border-color: #10b981;
  color: #10b981;
}

.status-disabled {
  border-color: #e11d48;
  color: #e11d48;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  line-height: 1;
}

.price-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.dialog-user-info {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}
</style>


