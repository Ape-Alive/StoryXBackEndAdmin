<template>
  <div class="order-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">订单结算管理</h1>
        <p class="page-description">管理所有终端用户的订单信息，支持多条件筛选和查询。</p>
      </div>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <OrderFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">待支付: {{ statistics.pending }}</span>
        <span class="stat-item">已支付: {{ statistics.paid }}</span>
        <span class="stat-item">已取消: {{ statistics.cancelled }}</span>
      </div>
    </div>
    <!-- 表格 -->
    <OrderTable :table-data="tableData" :loading="loading" @view="handleView" />

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

    <!-- 订单详情对话框 -->
    <OrderDetailDialog
      v-model="detailVisible"
      :order-id="currentOrderId"
      @close="handleDetailClose"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import OrderTable from './components/OrderTable.vue'
import OrderFilter from './components/OrderFilter.vue'
import OrderDetailDialog from './components/OrderDetailDialog.vue'
import { getOrders } from '@/api/order'

// 数据
const loading = ref(false)
const tableData = ref([])
const detailVisible = ref(false)
const currentOrderId = ref(null)

// 筛选条件
const filters = reactive({
  userId: '',
  status: '',
  type: '',
  orderNo: '',
  packageId: '',
  startDate: '',
  endDate: '',
  orderBy: 'createdAt',
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
  const pending = tableData.value.filter(item => item.status === 'pending').length
  const paid = tableData.value.filter(item => item.status === 'paid').length
  const cancelled = tableData.value.filter(item => item.status === 'cancelled').length
  return { total, pending, paid, cancelled }
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
    if (filters.status) params.status = filters.status
    if (filters.type) params.type = filters.type
    if (filters.orderNo) params.orderNo = filters.orderNo
    if (filters.packageId) params.packageId = filters.packageId
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    if (filters.orderBy) params.orderBy = filters.orderBy
    if (filters.order) params.order = filters.order

    const response = await getOrders(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取订单列表失败')
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
  currentOrderId.value = row.id
  detailVisible.value = true
}

// 关闭详情
function handleDetailClose() {
  detailVisible.value = false
  currentOrderId.value = null
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
.order-page {
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
