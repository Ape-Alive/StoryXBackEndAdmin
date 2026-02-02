<template>
  <div class="category-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">提示词分类管理</h1>
        <p class="page-description">管理提示词分类，用于组织和管理不同类型的提示词。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd"> 创建分类 </el-button>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <CategoryFilter v-model="filters" @search="handleSearch" />
    </div>
    <div class="statistics-container">
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
      </div>
    </div>
    <!-- 表格 -->
    <CategoryTable
      :table-data="tableData"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
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
    <CategoryForm v-model="formVisible" :category="currentCategory" @success="handleFormSuccess" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import CategoryTable from './components/CategoryTable.vue'
import CategoryForm from './components/CategoryForm.vue'
import CategoryFilter from './components/CategoryFilter.vue'
import {
  getPromptCategories,
  createPromptCategory,
  updatePromptCategory,
  deletePromptCategory
} from '@/api/prompt'

// 数据
const loading = ref(false)
const tableData = ref([])
const formVisible = ref(false)
const currentCategory = ref(null)

// 筛选条件
const filters = reactive({
  name: ''
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
  return { total }
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
      ...filters
    }
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await getPromptCategories(params)
    if (response.success) {
      tableData.value = response.data || []
      pagination.total = tableData.value.length
    }
  } catch (error) {
    ElMessage.error('获取分类列表失败')
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
  currentCategory.value = null
  formVisible.value = true
}

// 编辑
function handleEdit(row) {
  currentCategory.value = row
  formVisible.value = true
}

// 删除
function handleDelete(row) {
  if ((row._count?.prompts || 0) > 0) {
    ElMessage.warning('该分类下有关联的提示词，无法删除')
    return
  }

  ElMessageBox.confirm(`确定要删除分类 "${row.displayName}" 吗？此操作不可恢复。`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const response = await deletePromptCategory(row.id)
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

// 表单提交成功
async function handleFormSuccess(data) {
  try {
    let response
    if (currentCategory.value?.id) {
      // 更新
      response = await updatePromptCategory(currentCategory.value.id, data)
    } else {
      // 创建
      response = await createPromptCategory(data)
    }
    if (response.success) {
      ElMessage.success(currentCategory.value?.id ? '更新成功' : '创建成功')
      formVisible.value = false
      currentCategory.value = null
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
.category-page {
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
