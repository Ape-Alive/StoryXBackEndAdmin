<template>
  <div class="aicall-filter">
    <el-input
      v-model="filters.userId"
      placeholder="用户ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
    >
      <template #prefix>
        <el-icon><User /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.modelId"
      placeholder="模型ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
    >
      <template #prefix>
        <el-icon><Box /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.requestId"
      placeholder="请求ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 220px"
    >
      <template #prefix>
        <el-icon><Document /></el-icon>
      </template>
    </el-input>
    <div class="filter-group">
      <label class="filter-label">调用状态</label>
      <el-select
        v-model="filters.status"
        placeholder="选择状态"
        clearable
        class="filter-select"
        style="width: 150px"
      >
        <el-option label="全部" :value="undefined" />
        <el-option label="成功" value="success" />
        <el-option label="失败" value="failure" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">请求时间</label>
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        clearable
        class="filter-date-picker"
        style="width: 360px"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ss[Z]"
        @change="handleDateRangeChange"
      />
    </div>
    <el-button type="primary" @click="handleSearch">搜索</el-button>
  </div>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'
import { User, Box, Document } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const filters = reactive({
  userId: props.modelValue.userId || '',
  modelId: props.modelValue.modelId || '',
  requestId: props.modelValue.requestId || '',
  status: props.modelValue.status,
  startDate: props.modelValue.startDate || '',
  endDate: props.modelValue.endDate || ''
})

const dateRange = ref(null)

watch(
  () => props.modelValue,
  val => {
    filters.userId = val.userId || ''
    filters.modelId = val.modelId || ''
    filters.requestId = val.requestId || ''
    filters.status = val.status
    filters.startDate = val.startDate || ''
    filters.endDate = val.endDate || ''
    if (val.startDate && val.endDate) {
      dateRange.value = [val.startDate, val.endDate]
    } else {
      dateRange.value = null
    }
  },
  { deep: true }
)

watch(
  filters,
  val => {
    emit('update:modelValue', { ...val })
  },
  { deep: true }
)

function handleDateRangeChange(value) {
  if (value && value.length === 2) {
    filters.startDate = value[0] || ''
    filters.endDate = value[1] || ''
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
}

function handleSearch() {
  emit('search', { ...filters })
}
</script>

<style scoped>
.aicall-filter {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  flex: 1;
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
</style>
