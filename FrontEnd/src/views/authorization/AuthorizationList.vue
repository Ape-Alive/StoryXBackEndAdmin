<template>
  <div class="authorization-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">授权记录管理</h1>
        <p class="page-description">查看和管理终端用户的AI调用授权记录。</p>
      </div>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <AuthorizationFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">活跃: {{ statistics.active }}</span>
        <span class="stat-item">已撤销: {{ statistics.revoked }}</span>
        <span class="stat-item">已过期: {{ statistics.expired }}</span>
      </div>
    </div>
    <!-- 表格 -->
    <AuthorizationTable
      :table-data="tableData"
      :loading="loading"
      @revoke="handleRevoke"
      @view="handleView"
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

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="授权记录详情"
      width="800px"
    >
      <div v-if="currentAuthorization" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="授权ID">{{ currentAuthorization.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentAuthorization.status)" size="small">
              {{ getStatusText(currentAuthorization.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户信息">
            {{ currentAuthorization.user?.email || currentAuthorization.user?.phone || currentAuthorization.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="模型">
            {{ currentAuthorization.model?.displayName || currentAuthorization.model?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="提供商">
            {{ currentAuthorization.model?.provider?.displayName || currentAuthorization.model?.provider?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="设备指纹">
            {{ currentAuthorization.deviceFingerprint }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ currentAuthorization.ipAddress || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="冻结额度">
            {{ formatQuota(currentAuthorization.frozenQuota) }}
          </el-descriptions-item>
          <el-descriptions-item label="调用令牌" :span="2">
            <el-input
              :value="currentAuthorization.callToken || '-'"
              readonly
              type="textarea"
              :rows="2"
            />
          </el-descriptions-item>
          <el-descriptions-item label="请求ID">
            {{ currentAuthorization.requestId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="过期时间">
            {{ formatDateTime(currentAuthorization.expiresAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(currentAuthorization.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(currentAuthorization.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AuthorizationTable from './components/AuthorizationTable.vue'
import AuthorizationFilter from './components/AuthorizationFilter.vue'
import {
  getAuthorizations,
  revokeAuthorization,
  getAuthorizationDetail
} from '@/api/authorization'

// 数据
const loading = ref(false)
const tableData = ref([])
const detailVisible = ref(false)
const currentAuthorization = ref(null)

// 筛选条件
const filters = reactive({
  userId: '',
  modelId: '',
  callToken: '',
  requestId: '',
  status: undefined,
  activeOnly: undefined,
  startDate: '',
  endDate: ''
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
  const revoked = tableData.value.filter(item => item.status === 'revoked').length
  const expired = tableData.value.filter(item => item.status === 'expired').length
  return { total, active, revoked, expired }
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

    const response = await getAuthorizations(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      } else {
        pagination.total = response.total || 0
        pagination.page = response.page || 1
        pagination.pageSize = response.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取授权记录列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 撤销授权
function handleRevoke(row) {
  const message = `确定要撤销用户 "${row.user?.email || row.userId}" 的授权记录吗？\n\n如果授权是活跃状态且有冻结额度，会自动释放冻结的额度。`

  ElMessageBox.confirm(message, '确认撤销', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const response = await revokeAuthorization(row.id)
        if (response.success) {
          ElMessage.success('撤销成功')
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 查看详情
async function handleView(row) {
  try {
    const response = await getAuthorizationDetail(row.id)
    if (response.success) {
      currentAuthorization.value = response.data
      detailVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取授权详情失败')
  }
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 格式化额度
function formatQuota(quota) {
  if (quota === null || quota === undefined) return '-'
  return parseFloat(quota).toFixed(2)
}

// 获取状态类型
function getStatusType(status) {
  const statusMap = {
    active: 'success',
    revoked: 'danger',
    expired: 'warning',
    used: 'info'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    active: '活跃',
    revoked: '已撤销',
    expired: '已过期',
    used: '已使用'
  }
  return statusMap[status] || status
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
.authorization-page {
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
  flex-wrap: nowrap;
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

.detail-content {
  padding: 8px 0;
}
</style>
