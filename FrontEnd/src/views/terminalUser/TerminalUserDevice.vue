<template>
  <div class="user-device-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">设备管理</h1>
        <p class="page-description">管理终端用户的设备绑定、状态设置和批量操作。</p>
      </div>
      <div class="header-actions">
        <el-button
          v-if="selectedDevices.length > 0"
          type="warning"
          :icon="Lock"
          @click="handleBatchRevoke"
        >
          批量解绑 ({{ selectedDevices.length }})
        </el-button>
        <el-button
          v-if="selectedDevices.length > 0"
          type="success"
          :icon="Unlock"
          @click="handleBatchAllow"
        >
          批量恢复 ({{ selectedDevices.length }})
        </el-button>
        <el-button
          v-if="selectedDevices.length > 0"
          type="danger"
          :icon="Delete"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedDevices.length }})
        </el-button>
      </div>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <DeviceFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">活跃: {{ statistics.active }}</span>
        <span class="stat-item">已撤销: {{ statistics.revoked }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <DeviceTable
      :table-data="tableData"
      :loading="loading"
      @edit="handleEdit"
      @revoke="handleRevoke"
      @allow="handleAllow"
      @delete="handleDelete"
      @selection-change="handleSelectionChange"
    />

    <!-- 分页器 -->
    <div class="pagination-wrapper">
      <div class="pagination-info">
        共 {{ pagination.total }} 条记录, 当前显示 {{ paginationRange.start }}-{{
          paginationRange.end
        }}
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

    <!-- 编辑对话框 -->
    <DeviceEditDialog
      v-model="editVisible"
      :device="currentDevice"
      @success="handleEditSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock, Unlock, Delete } from '@element-plus/icons-vue'
import DeviceTable from './components/DeviceTable.vue'
import DeviceFilter from './components/DeviceFilter.vue'
import DeviceEditDialog from './components/DeviceEditDialog.vue'
import {
  getDevices,
  updateDevice,
  revokeDevice,
  allowDevice,
  batchUpdateDeviceStatus,
  batchDeleteDevices
} from '@/api/device'

// 数据
const loading = ref(false)
const tableData = ref([])
const editVisible = ref(false)
const currentDevice = ref(null)
const selectedDevices = ref([])

// 筛选条件
const filters = reactive({
  deviceId: '',
  userId: '',
  deviceFingerprint: '',
  ipAddress: '',
  status: undefined,
  lastUsedStart: '',
  lastUsedEnd: '',
  startDate: '',
  endDate: '',
  orderBy: 'lastUsedAt',
  order: 'desc'
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
  const active = tableData.value.filter(item => item.status === 'active').length
  const revoked = total - active
  return { total, active, revoked }
})

// 计算显示的记录范围
const paginationRange = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return { start, end }
})

// 获取列表数据
async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await getDevices(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取设备列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 编辑设备
function handleEdit(row) {
  currentDevice.value = row
  editVisible.value = true
}

// 解绑设备
function handleRevoke(row) {
  ElMessageBox.confirm(
    `确定要解绑设备 "${row.name || row.deviceFingerprint}" 吗？\n\n解绑后设备将无法继续使用。`,
    '确认解绑',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const response = await revokeDevice(row.id)
        if (response.success) {
          ElMessage.success('解绑成功')
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 恢复设备
function handleAllow(row) {
  ElMessageBox.confirm(
    `确定要恢复设备 "${row.name || row.deviceFingerprint}" 吗？`,
    '确认恢复',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  )
    .then(async () => {
      try {
        const response = await allowDevice(row.id)
        if (response.success) {
          ElMessage.success('恢复成功')
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 删除设备
function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除设备 "${row.name || row.deviceFingerprint}" 吗？\n\n警告：删除操作不可恢复！`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    }
  )
    .then(async () => {
      try {
        const response = await batchDeleteDevices({ ids: [row.id] })
        if (response.success) {
          ElMessage.success('删除成功')
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 批量解绑
function handleBatchRevoke() {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning('请先选择要解绑的设备')
    return
  }

  ElMessageBox.confirm(
    `确定要解绑选中的 ${selectedDevices.value.length} 个设备吗？\n\n解绑后设备将无法继续使用。`,
    '确认批量解绑',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const response = await batchUpdateDeviceStatus({
          ids: selectedDevices.value.map(d => d.id),
          status: 'revoked'
        })
        if (response.success) {
          ElMessage.success(`成功解绑 ${response.data?.count || 0} 个设备`)
          selectedDevices.value = []
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 批量恢复
function handleBatchAllow() {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning('请先选择要恢复的设备')
    return
  }

  ElMessageBox.confirm(
    `确定要恢复选中的 ${selectedDevices.value.length} 个设备吗？`,
    '确认批量恢复',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  )
    .then(async () => {
      try {
        const response = await batchUpdateDeviceStatus({
          ids: selectedDevices.value.map(d => d.id),
          status: 'active'
        })
        if (response.success) {
          ElMessage.success(`成功恢复 ${response.data?.count || 0} 个设备`)
          selectedDevices.value = []
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 批量删除
function handleBatchDelete() {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning('请先选择要删除的设备')
    return
  }

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedDevices.value.length} 个设备吗？\n\n警告：删除操作不可恢复！`,
    '确认批量删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    }
  )
    .then(async () => {
      try {
        const response = await batchDeleteDevices({
          ids: selectedDevices.value.map(d => d.id)
        })
        if (response.success) {
          ElMessage.success(`成功删除 ${response.data?.count || 0} 个设备`)
          selectedDevices.value = []
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 编辑成功
async function handleEditSuccess(data) {
  try {
    const response = await updateDevice(data.id, {
      name: data.name,
      remark: data.remark,
      status: data.status
    })
    if (response.success) {
      ElMessage.success('更新成功')
      editVisible.value = false
      currentDevice.value = null
      fetchData()
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  }
}

// 选择变化
function handleSelectionChange(selection) {
  selectedDevices.value = selection
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

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.user-device-page {
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

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.statistics-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin: 20px 0;
  flex-wrap: nowrap;
}

.statistics {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #64748b;
  flex-shrink: 0;
}

.stat-item {
  font-weight: 500;
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
</style>
