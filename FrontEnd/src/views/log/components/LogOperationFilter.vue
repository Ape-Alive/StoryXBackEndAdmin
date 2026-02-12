<template>
  <div class="operation-filter">
    <el-input
      v-model="filters.adminId"
      placeholder="管理员ID..."
      clearable
      class="filter-input"
      style="max-width: 160px"
    >
      <template #prefix>
        <el-icon><User /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.action"
      placeholder="操作类型..."
      clearable
      class="filter-input"
      style="max-width: 180px"
    >
      <template #prefix>
        <el-icon><Operation /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.targetType"
      placeholder="目标类型..."
      clearable
      class="filter-input"
      style="max-width: 140px"
    >
      <template #prefix>
        <el-icon><Aim /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.targetId"
      placeholder="目标ID..."
      clearable
      class="filter-input"
      style="max-width: 180px"
    >
      <template #prefix>
        <el-icon><Document /></el-icon>
      </template>
    </el-input>
    <div class="filter-group">
      <label class="filter-label">操作结果</label>
      <el-select
        v-model="filters.result"
        placeholder="选择结果"
        clearable
        class="filter-select"
        style="width: 140px"
      >
        <el-option label="全部" :value="undefined" />
        <el-option label="成功" value="success" />
        <el-option label="失败" value="failure" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">操作时间</label>
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
import { User, Operation, Aim, Document } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const filters = reactive({
  adminId: props.modelValue.adminId || '',
  action: props.modelValue.action || '',
  targetType: props.modelValue.targetType || '',
  targetId: props.modelValue.targetId || '',
  result: props.modelValue.result,
  startDate: props.modelValue.startDate || '',
  endDate: props.modelValue.endDate || ''
})

const dateRange = ref(null)

watch(
  () => props.modelValue,
  val => {
    filters.adminId = val.adminId || ''
    filters.action = val.action || ''
    filters.targetType = val.targetType || ''
    filters.targetId = val.targetId || ''
    filters.result = val.result
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
.operation-filter {
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
