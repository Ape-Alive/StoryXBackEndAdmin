<template>
  <div class="system-prompt-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统提示词管理</h1>
        <p class="page-description">管理系统提示词，支持版本管理和关联关系。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd"> 创建提示词 </el-button>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <SystemPromptFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">启用: {{ statistics.active }}</span>
        <span class="stat-item">禁用: {{ statistics.inactive }}</span>
      </div>
    </div>
    <!-- 表格 -->
    <PromptTable
      :table-data="tableData"
      :loading="loading"
      :user-role="userRole"
      :user-id="userId"
      @view="handleView"
      @edit="handleEdit"
      @delete="handleDelete"
      @versions="handleVersions"
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

    <!-- 创建/编辑表单对话框 -->
    <PromptForm
      v-model="formVisible"
      :prompt="currentPrompt"
      :prompt-type="formPromptType"
      @success="handleFormSuccess"
    />

    <!-- 详情对话框 -->
    <PromptDetailDialog
      v-model="detailVisible"
      :prompt-id="currentPromptId"
      @edit="handleEditFromDetail"
      @view-system="handleViewSystem"
    />

    <!-- 版本对话框 -->
    <PromptVersionDialog
      v-model="versionVisible"
      :prompt-id="currentPromptId"
      :current-version="currentVersion"
      @rollback-success="handleRollbackSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PromptTable from './components/PromptTable.vue'
import PromptForm from './components/PromptForm.vue'
import SystemPromptFilter from './components/SystemPromptFilter.vue'
import PromptDetailDialog from './components/PromptDetailDialog.vue'
import PromptVersionDialog from './components/PromptVersionDialog.vue'
import { getPrompts, createPrompt, updatePrompt, deletePrompt } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const userRole = computed(() => {
  // 优先从 user 获取，如果没有则从 admin 获取
  return authStore.user?.role || authStore.admin?.role || ''
})
const userId = computed(() => {
  return authStore.user?.id || authStore.admin?.id || ''
})

// 数据
const loading = ref(false)
const tableData = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const versionVisible = ref(false)
const currentPrompt = ref(null)
const currentPromptId = ref('')
const currentVersion = ref(1)
const formPromptType = ref('system') // 固定为 system

// 筛选条件
const filters = reactive({
  title: '',
  categoryId: '',
  isActive: undefined,
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
  const active = tableData.value.filter(item => item.isActive).length
  const inactive = total - active
  return { total, active, inactive }
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
      ...filters,
      // 固定查询 system 类型
      type: 'system'
    }
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await getPrompts(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取提示词列表失败')
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
  currentPrompt.value = null
  formPromptType.value = 'system' // 固定为 system 类型
  formVisible.value = true
}

// 查看详情
function handleView(row) {
  currentPromptId.value = row.id
  currentVersion.value = row.version
  detailVisible.value = true
}

// 编辑
function handleEdit(row) {
  currentPrompt.value = row
  formPromptType.value = row.type
  formVisible.value = true
}

// 从详情对话框编辑
function handleEditFromDetail(prompt) {
  currentPrompt.value = prompt
  formPromptType.value = prompt.type
  formVisible.value = true
}

// 删除
function handleDelete(row) {
  ElMessageBox.confirm(`确定要删除提示词 "${row.title}" 吗？此操作不可恢复。`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const response = await deletePrompt(row.id)
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

// 版本历史
function handleVersions(row) {
  currentPromptId.value = row.id
  currentVersion.value = row.version
  versionVisible.value = true
}

// 查看关联的系统提示词
function handleViewSystem(id) {
  currentPromptId.value = id
  detailVisible.value = true
}

// 表单提交成功
async function handleFormSuccess(data) {
  try {
    let response
    if (currentPrompt.value?.id) {
      // 更新
      response = await updatePrompt(currentPrompt.value.id, data)
    } else {
      // 创建
      response = await createPrompt(data)
    }
    if (response.success) {
      ElMessage.success(currentPrompt.value?.id ? '更新成功' : '创建成功')
      formVisible.value = false
      currentPrompt.value = null
      fetchData()
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  }
}

// 回滚成功
function handleRollbackSuccess() {
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

onMounted(async () => {
  // 确保管理员信息已加载（只在有 token 时尝试获取）
  if (authStore.isAuthenticated && !authStore.admin && !authStore.user) {
    try {
      await authStore.fetchCurrentAdmin()
    } catch (error) {
      // 如果获取失败（如 token 无效），不阻止页面加载
      console.warn('Failed to fetch admin info:', error)
    }
  }
  fetchData()
})
</script>

<style scoped>
.system-prompt-page {
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
