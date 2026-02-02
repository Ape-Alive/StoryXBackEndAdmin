<template>
  <div class="category-filter">
    <el-input
      v-model="localFilters.name"
      placeholder="分类名称关键词..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="debounceSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const localFilters = reactive({
  name: props.modelValue.name || ''
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
  emit('search', { ...localFilters })
}

watch(() => props.modelValue, (val) => {
  localFilters.name = val.name || ''
}, { deep: true })

watch(localFilters, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })
</script>

<style scoped>
.category-filter {
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
</style>
