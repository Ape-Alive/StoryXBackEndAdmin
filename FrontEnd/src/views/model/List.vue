<template>
  <div class="model-list-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">模型实例列表</h1>
        <p class="page-description">
          管理 AI 模型的基础信息、接口配置及可用状态。
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        新增模型
      </el-button>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <ModelFilter
        :name="filters.name"
        :type="filters.type"
        :isActive="filters.isActive"
        @update:name="filters.name = $event"
        @update:type="filters.type = $event"
        @update:isActive="filters.isActive = $event"
        @search="handleSearch"
      />
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">已启用: {{ statistics.active }}</span>
        <span class="stat-item">已禁用: {{ statistics.inactive }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <ModelTable
      :table-data="tableData"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
    />

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

    <!-- 新增/编辑对话框 -->
    <ModelForm
      v-model="formVisible"
      :model="currentModel"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import ModelTable from './components/ModelTable.vue'
import ModelForm from './components/ModelForm.vue'
import ModelFilter from './components/ModelFilter.vue'
import {
  getModels,
  createModel,
  updateModel,
  deleteModel
} from '@/api/model'

// 数据
const loading = ref(false)
const tableData = ref([])
const formVisible = ref(false)
const currentModel = ref(null)

// 筛选条件
const filters = reactive({
  name: '',
  displayName: '',
  type: '',
  category: '',
  providerId: '',
  isActive: undefined,
  requiresKey: undefined
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
  const inactive = tableData.value.filter(item => !item.isActive).length
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
      ...filters
    }
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await getModels(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取模型列表失败')
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
  currentModel.value = null
  formVisible.value = true
}

// 编辑
function handleEdit(row) {
  currentModel.value = { ...row }
  formVisible.value = true
}

// 删除
function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除模型 "${row.displayName || row.name}" 吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const response = await deleteModel(row.id)
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
    if (data.id) {
      // 更新
      const response = await updateModel(data.id, data)
      if (response.success) {
        ElMessage.success('更新成功')
        formVisible.value = false
        fetchData()
      }
    } else {
      // 新增
      const response = await createModel(data)
      if (response.success) {
        ElMessage.success('创建成功')
        formVisible.value = false
        fetchData()
      }
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
.model-list-page {
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

