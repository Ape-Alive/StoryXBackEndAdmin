<template>
  <div class="pricing-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">模型计费策略</h1>
        <p class="page-description">管理 AI 模型的价格配置，支持按Token计价和按调用次数计价。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd" :disabled="!selectedModelId">
        新增价格
      </el-button>
      <el-button type="default" @click="handleViewAll" :disabled="selectedModelId === ''">
        查看全部
      </el-button>
    </div>

    <!-- 模型选择器 -->
    <div class="model-selector-section">
      <el-select
        v-model="selectedModelId"
        placeholder="请选择模型（不选择则查看全部）"
        filterable
        clearable
        class="model-select-wide"
        @change="handleModelChange"
        :loading="modelsLoading"
      >
        <el-option label="全部模型" value="" />
        <el-option
          v-for="model in models"
          :key="model.id"
          :label="modelOptionFilterLabel(model)"
          :value="model.id"
        >
          <div class="model-option-row">
            <span class="model-option-name" :title="model.displayName || model.name">{{
              model.displayName || model.name
            }}</span>
            <div v-if="model.provider" class="model-option-provider">
              <img
                v-if="model.provider.logoUrl"
                :src="model.provider.logoUrl"
                class="provider-logo-img"
                alt=""
              />
              <span v-else class="provider-logo-fallback">{{
                providerInitial(model.provider)
              }}</span>
              <span class="provider-name-text" :title="providerDisplayName(model.provider)">{{
                providerDisplayName(model.provider)
              }}</span>
            </div>
            <span v-else class="model-option-provider model-option-provider--empty">—</span>
            <el-tag
              :type="model.isActive ? 'success' : 'info'"
              size="small"
              class="model-option-tag"
            >
              {{ model.isActive ? '已启用' : '已禁用' }}
            </el-tag>
          </div>
        </el-option>
      </el-select>
      <div v-if="selectedModelId" class="selected-model-info">
        <span class="info-label">当前模型：</span>
        <span v-if="selectedModelWithProvider?.provider" class="selected-provider-inline">
          <img
            v-if="selectedModelWithProvider.provider.logoUrl"
            :src="selectedModelWithProvider.provider.logoUrl"
            class="selected-provider-logo"
            alt=""
          />
          <span v-else class="selected-provider-logo-fallback">{{
            providerInitial(selectedModelWithProvider.provider)
          }}</span>
          <span class="selected-provider-name">{{
            providerDisplayName(selectedModelWithProvider.provider)
          }}</span>
          <span class="selected-model-sep">·</span>
        </span>
        <span class="info-value">{{ selectedModelName }}</span>
      </div>
      <div v-else class="selected-model-info">
        <span class="info-label">当前视图：</span>
        <span class="info-value">全部模型</span>
      </div>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <PriceFilter
        :pricingType="filters.pricingType"
        :packageId="filters.packageId"
        @update:pricingType="filters.pricingType = $event"
        @update:packageId="filters.packageId = $event"
        @search="handleSearch"
      />
      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">Token计价: {{ statistics.token }}</span>
        <span class="stat-item">调用次数计价: {{ statistics.call }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <PriceTable
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

    <!-- 新增/编辑对话框 -->
    <PriceForm
      v-model="formVisible"
      :price="currentPrice"
      :model-id="currentModelId"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PriceTable from './components/PriceTable.vue'
import PriceForm from './components/PriceForm.vue'
import PriceFilter from './components/PriceFilter.vue'
import {
  getModels,
  getModelPrices,
  createModelPrice,
  updateModelPrice,
  deleteModelPrice
} from '@/api/model'
// 数据
const loading = ref(false)
const modelsLoading = ref(false)
const tableData = ref([])
const formVisible = ref(false)
const currentPrice = ref(null)
const selectedModelId = ref('')
const models = ref([])

// 当前编辑/新增的模型ID（编辑时从 row 中获取，新增时使用 selectedModelId）
const currentModelId = computed(() => {
  // 如果是编辑模式，从 currentPrice 中获取 modelId
  if (currentPrice.value && currentPrice.value.modelId) {
    return currentPrice.value.modelId
  }
  // 如果是新增模式，使用 selectedModelId（必须要有值）
  return selectedModelId.value || ''
})

// 筛选条件
const filters = reactive({
  pricingType: '',
  packageId: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 当前选中的模型名称
const selectedModelName = computed(() => {
  const model = models.value.find(m => m.id === selectedModelId.value)
  return model ? model.displayName || model.name : ''
})

const selectedModelWithProvider = computed(() => {
  return models.value.find(m => m.id === selectedModelId.value) || null
})

function providerDisplayName(provider) {
  if (!provider) return ''
  return provider.displayName || provider.name || ''
}

function providerInitial(provider) {
  const n = providerDisplayName(provider)
  return n ? n.trim().charAt(0).toUpperCase() : '?'
}

function modelOptionFilterLabel(model) {
  const m = model.displayName || model.name
  const p = model.provider ? providerDisplayName(model.provider) : ''
  return p ? `${m} ${p}` : m
}

// 统计信息
const statistics = computed(() => {
  const total = pagination.total
  const token = tableData.value.filter(item => item.pricingType === 'token').length
  const call = tableData.value.filter(item => item.pricingType === 'call').length
  return { total, token, call }
})

// 计算显示的记录范围
const paginationRange = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return { start, end }
})

// 获取模型列表
async function fetchModels() {
  modelsLoading.value = true
  try {
    const response = await getModels({ page: 1, pageSize: 1000, isActive: true })
    if (response.success) {
      models.value = response.data || []
    }
  } catch (error) {
    ElMessage.error('获取模型列表失败')
  } finally {
    modelsLoading.value = false
  }
}

// 获取价格列表数据
async function fetchData() {
  loading.value = true
  try {
    const data = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }

    // 如果选择了模型，添加 modelId 到请求体
    if (selectedModelId.value) {
      data.modelId = selectedModelId.value
    }

    // 移除空值
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === undefined || data[key] === null) {
        delete data[key]
      }
    })

    const response = await getModelPrices(data)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取价格列表失败')
  } finally {
    loading.value = false
  }
}

// 模型变化
function handleModelChange() {
  pagination.page = 1
  fetchData()
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 新增
function handleAdd() {
  if (!selectedModelId.value) {
    ElMessage.warning('请先选择模型')
    return
  }
  currentPrice.value = null
  formVisible.value = true
}

// 查看全部
function handleViewAll() {
  selectedModelId.value = ''
  pagination.page = 1
  fetchData()
}

// 编辑
function handleEdit(row) {
  currentPrice.value = { ...row }
  formVisible.value = true
}

// 删除
function handleDelete(row) {
  const modelId = row.modelId || row.model?.id
  if (!modelId) {
    ElMessage.error('无法获取模型ID')
    return
  }
  ElMessageBox.confirm(`确定要删除该价格配置吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const response = await deleteModelPrice(modelId, row.id)
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
    // 获取模型ID：编辑时从 data 或 currentPrice 中获取，新增时使用 selectedModelId
    const modelId =
      data.modelId || (currentPrice.value && currentPrice.value.modelId) || selectedModelId.value

    if (!modelId) {
      ElMessage.error('无法获取模型ID')
      return
    }

    if (data.id) {
      // 更新
      const response = await updateModelPrice(modelId, data.id, data)
      if (response.success) {
        ElMessage.success('更新成功')
        formVisible.value = false
        fetchData()
      }
    } else {
      // 新增
      const response = await createModelPrice(modelId, data)
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
  handleViewAll()
  fetchModels()
})
</script>

<style scoped>
.pricing-page {
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

.model-selector-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px 16px 16px 0;
  background: white;
  border-radius: 8px;
}

.selected-model-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-label {
  color: #64748b;
}

.info-value {
  color: #0f172a;
  font-weight: 600;
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

.empty-state {
  padding: 80px 0;
  background: white;
  border-radius: 8px;
  text-align: center;
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

.model-select-wide {
  width: 520px;
  max-width: 100%;
}

.model-option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding-right: 4px;
}

.model-option-name {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #0f172a;
}

.model-option-provider {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 1 42%;
  min-width: 0;
  justify-content: center;
}

.model-option-provider--empty {
  color: #94a3b8;
  font-size: 13px;
  justify-content: center;
}

.provider-logo-img {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f1f5f9;
}

.provider-logo-fallback {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #e2e8f0;
}

.provider-name-text {
  min-width: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #64748b;
}

.model-option-tag {
  flex-shrink: 0;
  margin-left: auto;
}

.selected-provider-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 4px;
}

.selected-provider-logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
  vertical-align: middle;
}

.selected-provider-logo-fallback {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #475569;
  background: #e2e8f0;
}

.selected-provider-name {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.selected-model-sep {
  margin: 0 4px;
  color: #94a3b8;
}
</style>
