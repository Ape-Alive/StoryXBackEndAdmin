<template>
  <div class="quota-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户额度管理</h1>
        <p class="page-description">管理终端用户的额度分配、冻结、解冻和调整操作。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleBatchAdjust">批量调整</el-button>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <QuotaFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">可用总额: {{ formatNumber(statistics.totalAvailable) }}</span>
        <span class="stat-item">冻结总额: {{ formatNumber(statistics.totalFrozen) }}</span>
        <span class="stat-item">已用总额: {{ formatNumber(statistics.totalUsed) }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <QuotaTable
      :table-data="tableData"
      :loading="loading"
      @adjust="handleAdjust"
      @freeze="handleFreeze"
      @unfreeze="handleUnfreeze"
      @set="handleSet"
      @reset="handleReset"
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

    <!-- 调整额度对话框 -->
    <QuotaAdjustDialog
      v-model="adjustVisible"
      :quota="currentQuota"
      @success="handleAdjustSuccess"
    />

    <!-- 冻结额度对话框 -->
    <QuotaFreezeDialog
      v-model="freezeVisible"
      :quota="currentQuota"
      @success="handleFreezeSuccess"
    />

    <!-- 解冻额度对话框 -->
    <QuotaUnfreezeDialog
      v-model="unfreezeVisible"
      :quota="currentQuota"
      @success="handleUnfreezeSuccess"
    />

    <!-- 设置额度对话框 -->
    <QuotaSetDialog v-model="setVisible" :quota="currentQuota" @success="handleSetSuccess" />

    <!-- 重置额度对话框 -->
    <QuotaResetDialog v-model="resetVisible" :quota="currentQuota" @success="handleResetSuccess" />

    <!-- 批量调整对话框 -->
    <QuotaBatchAdjustDialog v-model="batchAdjustVisible" @success="handleBatchAdjustSuccess" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import QuotaTable from './components/QuotaTable.vue'
import QuotaFilter from './components/QuotaFilter.vue'
import QuotaAdjustDialog from './components/QuotaAdjustDialog.vue'
import QuotaFreezeDialog from './components/QuotaFreezeDialog.vue'
import QuotaUnfreezeDialog from './components/QuotaUnfreezeDialog.vue'
import QuotaSetDialog from './components/QuotaSetDialog.vue'
import QuotaResetDialog from './components/QuotaResetDialog.vue'
import QuotaBatchAdjustDialog from './components/QuotaBatchAdjustDialog.vue'
import { getQuotas, getQuotaStatistics } from '@/api/quota'

// 数据
const loading = ref(false)
const tableData = ref([])
const adjustVisible = ref(false)
const freezeVisible = ref(false)
const unfreezeVisible = ref(false)
const setVisible = ref(false)
const resetVisible = ref(false)
const batchAdjustVisible = ref(false)
const currentQuota = ref(null)

// 筛选条件
const filters = reactive({
  userId: '',
  packageId: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 统计信息
const statistics = reactive({
  total: 0,
  totalAvailable: 0,
  totalFrozen: 0,
  totalUsed: 0
})

// 计算显示的记录范围
const paginationRange = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return { start, end }
})

// 格式化数字
function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  const n = parseFloat(num)
  if (isNaN(n)) return '0'
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

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

    const response = await getQuotas(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取额度列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计信息
async function fetchStatistics() {
  try {
    const params = { ...filters }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await getQuotaStatistics(params)
    if (response.success && response.data) {
      statistics.total = response.data.terminalUserCount || 0
      statistics.totalAvailable = parseFloat(response.data.totalAvailable || 0)
      statistics.totalFrozen = parseFloat(response.data.totalFrozen || 0)
      statistics.totalUsed = parseFloat(response.data.totalUsed || 0)
    }
  } catch (error) {
    // 静默失败
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
  fetchStatistics()
}

// 调整额度
function handleAdjust(row) {
  currentQuota.value = { ...row }
  adjustVisible.value = true
}

// 冻结额度
function handleFreeze(row) {
  currentQuota.value = { ...row }
  freezeVisible.value = true
}

// 解冻额度
function handleUnfreeze(row) {
  currentQuota.value = { ...row }
  unfreezeVisible.value = true
}

// 设置额度
function handleSet(row) {
  currentQuota.value = { ...row }
  setVisible.value = true
}

// 重置额度
function handleReset(row) {
  currentQuota.value = { ...row }
  resetVisible.value = true
}

// 批量调整
function handleBatchAdjust() {
  batchAdjustVisible.value = true
}

// 操作成功回调
function handleAdjustSuccess() {
  adjustVisible.value = false
  fetchData()
  fetchStatistics()
}

function handleFreezeSuccess() {
  freezeVisible.value = false
  fetchData()
  fetchStatistics()
}

function handleUnfreezeSuccess() {
  unfreezeVisible.value = false
  fetchData()
  fetchStatistics()
}

function handleSetSuccess() {
  setVisible.value = false
  fetchData()
  fetchStatistics()
}

function handleResetSuccess() {
  resetVisible.value = false
  fetchData()
  fetchStatistics()
}

function handleBatchAdjustSuccess() {
  batchAdjustVisible.value = false
  fetchData()
  fetchStatistics()
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
  fetchStatistics()
})
</script>

<style scoped>
.quota-page {
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
  margin-bottom: 16px;
}

.statistics-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 16px;
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
