<template>
  <div class="device-filter">
    <el-input
      v-model="filters.deviceId"
      placeholder="设备ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Monitor /></el-icon>
      </template>
    </el-input>
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
      v-model="filters.deviceFingerprint"
      placeholder="设备指纹筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Key /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.ipAddress"
      placeholder="IP地址筛选..."
      clearable
      class="filter-input"
      style="max-width: 180px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Location /></el-icon>
      </template>
    </el-input>
    <div class="filter-group">
      <label class="filter-label">设备状态</label>
      <el-select
        v-model="filters.status"
        placeholder="选择状态"
        clearable
        class="filter-select"
        style="width: 150px"
        @change="handleSearch"
      >
        <el-option label="全部" :value="undefined" />
        <el-option label="活跃" value="active" />
        <el-option label="已撤销" value="revoked" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">最后使用时间</label>
      <el-date-picker
        v-model="lastUsedDateRange"
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
    <div class="filter-group">
      <label class="filter-label">创建时间</label>
      <el-date-picker
        v-model="createdDateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        clearable
        class="filter-date-picker"
        style="width: 360px"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ss[Z]"
        @change="handleCreatedDateRangeChange"
      />
    </div>
    <div class="filter-group">
      <label class="filter-label">排序</label>
      <el-select
        v-model="filters.orderBy"
        placeholder="排序字段"
        class="filter-select"
        style="width: 140px"
        @change="handleSearch"
      >
        <el-option label="最后使用时间" value="lastUsedAt" />
        <el-option label="创建时间" value="createdAt" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">排序顺序</label>
      <el-select
        v-model="filters.order"
        placeholder="排序顺序"
        class="filter-select"
        style="width: 120px"
        @change="handleSearch"
      >
        <el-option label="降序" value="desc" />
        <el-option label="升序" value="asc" />
      </el-select>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'
import { Monitor, User, Key, Location } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const filters = reactive({
  deviceId: props.modelValue.deviceId || '',
  userId: props.modelValue.userId || '',
  deviceFingerprint: props.modelValue.deviceFingerprint || '',
  ipAddress: props.modelValue.ipAddress || '',
  status: props.modelValue.status,
  lastUsedStart: props.modelValue.lastUsedStart || '',
  lastUsedEnd: props.modelValue.lastUsedEnd || '',
  startDate: props.modelValue.startDate || '',
  endDate: props.modelValue.endDate || '',
  orderBy: props.modelValue.orderBy || 'lastUsedAt',
  order: props.modelValue.order || 'desc'
})

// 日期范围选择器
const lastUsedDateRange = ref(null)
const createdDateRange = ref(null)

watch(
  () => props.modelValue,
  val => {
    filters.deviceId = val.deviceId || ''
    filters.userId = val.userId || ''
    filters.deviceFingerprint = val.deviceFingerprint || ''
    filters.ipAddress = val.ipAddress || ''
    filters.status = val.status
    filters.lastUsedStart = val.lastUsedStart || ''
    filters.lastUsedEnd = val.lastUsedEnd || ''
    filters.startDate = val.startDate || ''
    filters.endDate = val.endDate || ''
    filters.orderBy = val.orderBy || 'lastUsedAt'
    filters.order = val.order || 'desc'

    // 设置日期范围选择器的值
    if (val.lastUsedStart && val.lastUsedEnd) {
      lastUsedDateRange.value = [val.lastUsedStart, val.lastUsedEnd]
    } else {
      lastUsedDateRange.value = null
    }

    if (val.startDate && val.endDate) {
      createdDateRange.value = [val.startDate, val.endDate]
    } else {
      createdDateRange.value = null
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

function handleSearch() {
  emit('search', { ...filters })
}

function handleDateRangeChange(value) {
  if (value && value.length === 2) {
    filters.lastUsedStart = value[0] || ''
    filters.lastUsedEnd = value[1] || ''
  } else {
    filters.lastUsedStart = ''
    filters.lastUsedEnd = ''
  }
  handleSearch()
}

function handleCreatedDateRangeChange(value) {
  if (value && value.length === 2) {
    filters.startDate = value[0] || ''
    filters.endDate = value[1] || ''
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  handleSearch()
}
</script>

<style scoped>
.device-filter {
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
