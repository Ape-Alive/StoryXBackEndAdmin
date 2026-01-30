<template>
  <div class="user-package-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户套餐管理</h1>
        <p class="page-description">管理终端用户的套餐分配、优先级设置和延期操作。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd"> 分配套餐 </el-button>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <UserPackageFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">活跃: {{ statistics.active }}</span>
        <span class="stat-item">已过期: {{ statistics.expired }}</span>
      </div>
    </div>
    <!-- 表格 -->
    <UserPackageTable
      :table-data="tableData"
      :loading="loading"
      @edit-priority="handleEditPriority"
      @extend="handleExtend"
      @cancel="handleCancel"
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

    <!-- 分配套餐对话框 -->
    <UserPackageForm v-model="formVisible" @success="handleFormSuccess" />

    <!-- 延期对话框 -->
    <UserPackageExtendDialog
      v-model="extendVisible"
      :user-package="currentUserPackage"
      @success="handleExtendSuccess"
    />

    <!-- 优先级对话框 -->
    <UserPackagePriorityDialog
      v-model="priorityVisible"
      :user-package="currentUserPackage"
      @success="handlePrioritySuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import UserPackageTable from './components/UserPackageTable.vue'
import UserPackageForm from './components/UserPackageForm.vue'
import UserPackageFilter from './components/UserPackageFilter.vue'
import UserPackageExtendDialog from './components/UserPackageExtendDialog.vue'
import UserPackagePriorityDialog from './components/UserPackagePriorityDialog.vue'
import {
  getUserPackages,
  assignPackageToUser,
  cancelUserPackage,
  updateUserPackagePriority,
  extendUserPackage
} from '@/api/userPackage'

// 数据
const loading = ref(false)
const tableData = ref([])
const formVisible = ref(false)
const extendVisible = ref(false)
const priorityVisible = ref(false)
const currentUserPackage = ref(null)

// 筛选条件
const filters = reactive({
  userId: '',
  packageId: '',
  priority: undefined,
  startDate: '',
  activeOnly: undefined
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
  const now = new Date()
  const active = tableData.value.filter(item => {
    if (!item.startedAt) return false
    const startedAt = new Date(item.startedAt)
    if (startedAt > now) return false
    if (!item.expiresAt) return true
    const expiresAt = new Date(item.expiresAt)
    return expiresAt > now
  }).length
  const expired = total - active
  return { total, active, expired }
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

    const response = await getUserPackages(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取用户套餐列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 新增
function handleAdd() {
  formVisible.value = true
}

// 修改优先级
function handleEditPriority(row) {
  currentUserPackage.value = row
  priorityVisible.value = true
}

// 延期
function handleExtend(row) {
  currentUserPackage.value = row
  extendVisible.value = true
}

// 取消套餐
function handleCancel(row) {
  ElMessageBox.confirm(
    `确定要取消用户 "${row.user?.email || row.userId}" 的套餐 "${row.package?.displayName || row.package?.name || '未知'}" 吗？`,
    '确认取消',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const response = await cancelUserPackage(row.id)
        if (response.success) {
          ElMessage.success('取消成功')
          fetchData()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      }
    })
    .catch(() => {})
}

// 表单提交成功（分配套餐）
async function handleFormSuccess(data) {
  try {
    const response = await assignPackageToUser(data)
    if (response.success) {
      ElMessage.success('分配成功')
      formVisible.value = false
      fetchData()
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  }
}

// 延期成功
async function handleExtendSuccess(data) {
  try {
    const response = await extendUserPackage(data.id, { days: data.days })
    if (response.success) {
      ElMessage.success('延期成功')
      extendVisible.value = false
      currentUserPackage.value = null
      fetchData()
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  }
}

// 优先级修改成功
async function handlePrioritySuccess(data) {
  try {
    const response = await updateUserPackagePriority(data.id, { priority: data.priority })
    if (response.success) {
      ElMessage.success('优先级修改成功')
      priorityVisible.value = false
      currentUserPackage.value = null
      fetchData()
    }
  } catch (error) {
    // 错误已在 request.js 中处理
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

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.user-package-page {
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
</style>
