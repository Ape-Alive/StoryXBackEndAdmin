<template>
  <div class="quota-billing-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">额度流水管理</h1>
        <p class="page-description">查看和管理所有终端用户的额度流水记录，支持多条件筛选和导出。</p>
      </div>
      <div class="header-actions">
        <el-button
          v-if="selectedIds.length > 0"
          type="danger"
          :icon="Delete"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedIds.length }})
        </el-button>
        <el-button type="primary" :icon="Download" @click="handleExport">导出流水</el-button>
      </div>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <QuotaRecordFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">增加: {{ statistics.increase }}</span>
        <span class="stat-item">减少: {{ statistics.decrease }}</span>
        <span class="stat-item">冻结: {{ statistics.freeze }}</span>
        <span class="stat-item">解冻: {{ statistics.unfreeze }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <QuotaRecordTable
      :table-data="tableData"
      :loading="loading"
      @view="handleView"
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

    <!-- 流水详情对话框 -->
    <QuotaRecordDetailDialog
      v-model="detailVisible"
      :record-id="currentRecordId"
      @close="handleDetailClose"
    />

    <!-- 批量删除对话框 -->
    <QuotaRecordBatchDeleteDialog
      v-model="batchDeleteVisible"
      :selected-ids="selectedIds"
      @success="handleBatchDeleteSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Delete } from '@element-plus/icons-vue'
import QuotaRecordTable from './components/QuotaRecordTable.vue'
import QuotaRecordFilter from './components/QuotaRecordFilter.vue'
import QuotaRecordDetailDialog from './components/QuotaRecordDetailDialog.vue'
import QuotaRecordBatchDeleteDialog from './components/QuotaRecordBatchDeleteDialog.vue'
import { getQuotaRecords, exportQuotaRecords } from '@/api/quotaRecord'

// 数据
const loading = ref(false)
const tableData = ref([])
const detailVisible = ref(false)
const batchDeleteVisible = ref(false)
const currentRecordId = ref(null)
const selectedIds = ref([])

// 筛选条件
const filters = reactive({
  userId: '',
  packageId: '',
  orderId: '',
  type: '',
  requestId: '',
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
  const increase = tableData.value.filter(item => item.type === 'increase').length
  const decrease = tableData.value.filter(item => item.type === 'decrease').length
  const freeze = tableData.value.filter(item => item.type === 'freeze').length
  const unfreeze = tableData.value.filter(item => item.type === 'unfreeze').length
  return { total, increase, decrease, freeze, unfreeze }
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
      pageSize: pagination.pageSize
    }

    // 只添加非空的筛选条件
    if (filters.userId) params.userId = filters.userId
    if (filters.packageId) params.packageId = filters.packageId
    if (filters.orderId) params.orderId = filters.orderId
    if (filters.type) params.type = filters.type
    if (filters.requestId) params.requestId = filters.requestId
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const response = await getQuotaRecords(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取额度流水列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 查看详情
function handleView(row) {
  currentRecordId.value = row.id
  detailVisible.value = true
}

// 删除
function handleDelete(row) {
  selectedIds.value = [row.id]
  batchDeleteVisible.value = true
}

// 选择变化
function handleSelectionChange(ids) {
  selectedIds.value = ids
}

// 批量删除
function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }
  batchDeleteVisible.value = true
}

// 导出
async function handleExport() {
  try {
    const params = { ...filters }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await exportQuotaRecords(params)
    if (response.success && response.data) {
      // 这里可以处理导出逻辑，比如下载文件
      ElMessage.success('导出成功')
    }
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 关闭详情
function handleDetailClose() {
  detailVisible.value = false
  currentRecordId.value = null
}

// 批量删除成功
function handleBatchDeleteSuccess() {
  batchDeleteVisible.value = false
  selectedIds.value = []
  fetchData()
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
.quota-billing-page {
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

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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
</style>
