<template>
  <div class="prompt-filter">
    <el-input
      v-model="localFilters.title"
      placeholder="标题关键词..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="debounceSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <el-select
      v-model="localFilters.categoryId"
      placeholder="选择分类"
      clearable
      class="filter-select"
      style="width: 200px"
      @change="handleSearch"
    >
      <el-option
        v-for="category in categories"
        :key="category.id"
        :label="category.displayName"
        :value="category.id"
      />
    </el-select>
    <el-select
      v-model="localFilters.isActive"
      placeholder="状态"
      clearable
      class="filter-select"
      style="width: 120px"
      @change="handleSearch"
    >
      <el-option label="全部" :value="undefined" />
      <el-option label="启用" :value="true" />
      <el-option label="禁用" :value="false" />
    </el-select>
    <div class="filter-group">
      <label class="filter-label">创建时间</label>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DDTHH:mm:ss"
        class="filter-date-picker"
        style="width: 300px"
        @change="handleDateChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getPromptCategories } from '@/api/prompt'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const categories = ref([])
const dateRange = ref([])

const localFilters = reactive({
  title: props.modelValue.title || '',
  categoryId: props.modelValue.categoryId || '',
  isActive: props.modelValue.isActive,
  startDate: props.modelValue.startDate || '',
  endDate: props.modelValue.endDate || ''
})

// 防抖函数
let debounceTimer = null
function debounceSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

function handleSearch() {
  // 先更新父组件的 filters
  emit('update:modelValue', { ...localFilters })
  // 然后触发搜索事件
  emit('search', { ...localFilters })
}

function handleDateChange(dates) {
  if (dates && dates.length === 2) {
    localFilters.startDate = dates[0]
    localFilters.endDate = dates[1]
  } else {
    localFilters.startDate = ''
    localFilters.endDate = ''
  }
  handleSearch()
}

watch(() => props.modelValue, (val) => {
  // 只在外部值真正变化时更新本地值，避免循环更新
  const newTitle = val.title || ''
  const newCategoryId = val.categoryId || ''
  const newIsActive = val.isActive
  const newStartDate = val.startDate || ''
  const newEndDate = val.endDate || ''

  if (localFilters.title !== newTitle) {
    localFilters.title = newTitle
  }
  if (localFilters.categoryId !== newCategoryId) {
    localFilters.categoryId = newCategoryId
  }
  if (localFilters.isActive !== newIsActive) {
    localFilters.isActive = newIsActive
  }
  if (localFilters.startDate !== newStartDate) {
    localFilters.startDate = newStartDate
  }
  if (localFilters.endDate !== newEndDate) {
    localFilters.endDate = newEndDate
  }

  // 更新日期选择器
  if (newStartDate && newEndDate) {
    dateRange.value = [newStartDate, newEndDate]
  } else {
    dateRange.value = []
  }
}, { deep: true, immediate: false })

// 加载分类列表
async function loadCategories() {
  try {
    const response = await getPromptCategories()
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('加载分类列表失败', error)
  }
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.prompt-filter {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: nowrap;
}

.filter-input {
  flex-shrink: 0;
  align-self: flex-end;
}

.filter-input :deep(.el-input__wrapper) {
  height: 32px;
}

.filter-select {
  flex-shrink: 0;
}

.filter-select :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  transition: all 0.2s;
}

.filter-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.filter-select :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  justify-content: flex-end;
}

.filter-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin: 0;
  padding: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.filter-date-picker {
  flex-shrink: 0;
}

.filter-date-picker :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  transition: all 0.2s;
}

.filter-date-picker :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.filter-date-picker :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}
</style>
