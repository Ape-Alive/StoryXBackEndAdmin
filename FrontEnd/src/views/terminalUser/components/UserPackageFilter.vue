<template>
  <div class="user-package-filter">
    <el-input
      v-model="filters.userId"
      placeholder="用户ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><User /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.packageId"
      placeholder="套餐ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Box /></el-icon>
      </template>
    </el-input>
    <div class="filter-group">
      <label class="filter-label">优先级</label>
      <el-select
        v-model="filters.priority"
        placeholder="选择优先级"
        clearable
        class="filter-select"
        style="width: 150px"
        @change="handleSearch"
      >
        <el-option label="全部" :value="undefined" />
        <el-option label="高 (80-100)" value="high" />
        <el-option label="中 (40-79)" value="medium" />
        <el-option label="低 (0-39)" value="low" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">开始时间</label>
      <el-date-picker
        v-model="filters.startDate"
        type="date"
        placeholder="选择开始时间"
        clearable
        class="filter-date-picker"
        style="width: 180px"
        value-format="YYYY-MM-DD"
        @change="handleSearch"
      />
    </div>
    <el-select
      v-model="filters.activeOnly"
      placeholder="套餐状态"
      clearable
      class="filter-select"
      style="max-width: 150px"
      @change="handleSearch"
    >
      <el-option label="全部" :value="undefined" />
      <el-option label="仅活跃" :value="true" />
      <el-option label="仅非活跃" :value="false" />
    </el-select>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { User, Box } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const filters = reactive({
  userId: props.modelValue.userId || '',
  packageId: props.modelValue.packageId || '',
  priority: props.modelValue.priority,
  startDate: props.modelValue.startDate || '',
  activeOnly: props.modelValue.activeOnly
})

watch(() => props.modelValue, (val) => {
  filters.userId = val.userId || ''
  filters.packageId = val.packageId || ''
  filters.priority = val.priority
  filters.startDate = val.startDate || ''
  filters.activeOnly = val.activeOnly
}, { deep: true })

watch(filters, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })

function handleSearch() {
  emit('search', { ...filters })
}
</script>

<style scoped>
.user-package-filter {
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

.filter-select {
  flex-shrink: 0;
  width: 100%;
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

.filter-date-picker {
  flex-shrink: 0;
  width: 100%;
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
