<template>
  <div class="authorization-filter">
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
      v-model="filters.modelId"
      placeholder="模型ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Box /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="filters.callToken"
      placeholder="调用令牌筛选..."
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
      v-model="filters.requestId"
      placeholder="请求ID筛选..."
      clearable
      class="filter-input"
      style="max-width: 200px"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Document /></el-icon>
      </template>
    </el-input>
    <el-select
      v-model="filters.status"
      placeholder="授权状态"
      clearable
      class="filter-select"
      style="max-width: 150px"
      @change="handleSearch"
    >
      <el-option label="全部" :value="undefined" />
      <el-option label="活跃" value="active" />
      <el-option label="已撤销" value="revoked" />
      <el-option label="已过期" value="expired" />
      <el-option label="已使用" value="used" />
    </el-select>
    <el-select
      v-model="filters.activeOnly"
      placeholder="筛选类型"
      clearable
      class="filter-select"
      style="max-width: 150px"
      @change="handleSearch"
    >
      <el-option label="全部" :value="undefined" />
      <el-option label="仅活跃" :value="true" />
    </el-select>
    <div class="filter-group">
      <label class="filter-label">创建时间</label>
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        clearable
        class="filter-date-picker"
        style="width: 360px"
        value-format="YYYY-MM-DDTHH:mm:ss[Z]"
        format="YYYY-MM-DD HH:mm:ss"
        @change="handleDateRangeChange"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { User, Box, Key, Document } from '@element-plus/icons-vue'

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
  callToken: props.modelValue.callToken || '',
  requestId: props.modelValue.requestId || '',
  status: props.modelValue.status,
  activeOnly: props.modelValue.activeOnly,
  startDate: props.modelValue.startDate || '',
  endDate: props.modelValue.endDate || ''
})

const dateRange = ref(null)

watch(
  () => props.modelValue,
  val => {
    filters.userId = val.userId || ''
    filters.modelId = val.modelId || ''
    filters.callToken = val.callToken || ''
    filters.requestId = val.requestId || ''
    filters.status = val.status
    filters.activeOnly = val.activeOnly
    filters.startDate = val.startDate || ''
    filters.endDate = val.endDate || ''

    // 更新日期范围选择器
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

function handleSearch() {
  emit('search')
}

function handleDateRangeChange(value) {
  if (value && value.length === 2) {
    filters.startDate = value[0]
    filters.endDate = value[1]
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  handleSearch()
}
</script>

<style scoped>
.authorization-filter {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
}

.filter-input {
  flex-shrink: 0;
}

.filter-select {
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
}

.filter-date-picker {
  flex-shrink: 0;
}
</style>
