<template>
  <div class="order-filter">
    <div class="filter-group">
      <label class="filter-label">订单状态</label>
      <el-select
        v-model="localFilters.status"
        placeholder="请选择状态"
        clearable
        class="filter-select"
        style="width: 100px"
        @change="handleSelectChange('status')"
        @clear="handleClear('status')"
      >
        <el-option label="待支付" value="pending" />
        <el-option label="已支付" value="paid" />
        <el-option label="已取消" value="cancelled" />
        <el-option label="已退款" value="refunded" />
        <el-option label="已过期" value="expired" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">订单类型</label>
      <el-select
        v-model="localFilters.type"
        placeholder="请选择类型"
        clearable
        class="filter-select"
        style="width: 100px"
        @change="handleSelectChange('type')"
        @clear="handleClear('type')"
      >
        <el-option label="购买" value="purchase" />
        <el-option label="续费" value="renewal" />
        <el-option label="升级" value="upgrade" />
      </el-select>
    </div>
    <div class="filter-group">
      <label class="filter-label">订单号</label>
      <el-input
        v-model="localFilters.orderNo"
        placeholder="请输入订单号"
        clearable
        class="filter-input"
        style="width: 180px"
        @input="val => handleInput('orderNo', val)"
        @clear="handleInputClear('orderNo')"
      />
    </div>
    <div class="filter-group">
      <label class="filter-label">用户ID</label>
      <el-input
        v-model="localFilters.userId"
        placeholder="请输入用户ID"
        clearable
        class="filter-input"
        style="width: 180px"
        @input="val => handleInput('userId', val)"
        @clear="handleInputClear('userId')"
      />
    </div>
    <div class="filter-group">
      <label class="filter-label">套餐ID</label>
      <el-input
        v-model="localFilters.packageId"
        placeholder="请输入套餐ID"
        clearable
        class="filter-input"
        style="width: 180px"
        @input="val => handleInput('packageId', val)"
        @clear="handleInputClear('packageId')"
      />
    </div>

    <div class="filter-group">
      <label class="filter-label">创建时间</label>
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ssZ"
        class="filter-date-picker"
        @change="handleDateChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      userId: '',
      status: '',
      type: '',
      orderNo: '',
      packageId: '',
      startDate: '',
      endDate: '',
      orderBy: 'createdAt',
      order: 'desc'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const localFilters = ref({
  userId: props.modelValue.userId || '',
  status: props.modelValue.status || '',
  type: props.modelValue.type || '',
  orderNo: props.modelValue.orderNo || '',
  packageId: props.modelValue.packageId || '',
  startDate: props.modelValue.startDate || '',
  endDate: props.modelValue.endDate || '',
  orderBy: props.modelValue.orderBy || 'createdAt',
  order: props.modelValue.order || 'desc'
})

const dateRange = ref(null)

// 防抖定时器
let debounceTimer = null

// 防抖函数
function debounce(func, delay = 500) {
  return function (...args) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

// 监听本地变化，同步到父组件
watch(
  localFilters,
  val => {
    emit('update:modelValue', { ...val })
  },
  { deep: true }
)

// 创建防抖的搜索函数
const debouncedSearch = debounce(() => {
  emit('search', { ...localFilters.value })
}, 500)

function handleDateChange(val) {
  if (val && val.length === 2) {
    localFilters.value.startDate = val[0]
    localFilters.value.endDate = val[1]
  } else {
    localFilters.value.startDate = ''
    localFilters.value.endDate = ''
  }
  handleSearch()
}

function handleSelectChange(field) {
  // 确保值为字符串或空字符串
  const value = localFilters.value[field]
  if (value === null || value === undefined) {
    localFilters.value[field] = ''
  }
  handleSearch()
}

function handleClear(field) {
  // v-model 已经自动清空了值，这里只需要触发搜索
  nextTick(() => {
    // 确保值为空字符串
    if (localFilters.value[field] === null || localFilters.value[field] === undefined) {
      localFilters.value[field] = ''
    }
    handleSearch()
  })
}

// 输入框输入处理（带防抖）
function handleInput(field, value) {
  localFilters.value[field] = value || ''
  debouncedSearch()
}

// 输入框清空处理（立即触发）
function handleInputClear(field) {
  // v-model 已经自动清空了值，这里只需要触发搜索
  nextTick(() => {
    // 确保值为空字符串
    if (localFilters.value[field] === null || localFilters.value[field] === undefined) {
      localFilters.value[field] = ''
    }
    handleSearch()
  })
}

function handleSearch() {
  emit('search', { ...localFilters.value })
}
</script>

<style scoped>
.order-filter {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: nowrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: flex-end;
}

.filter-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin: 0;
  line-height: 1;
  white-space: nowrap;
}

.filter-input {
  width: 100%;
}

.filter-input :deep(.el-input__wrapper),
.filter-select :deep(.el-input__wrapper),
.filter-date-picker :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  transition: all 0.2s;
}

.filter-input :deep(.el-input__wrapper):hover,
.filter-select :deep(.el-input__wrapper):hover,
.filter-date-picker :deep(.el-input__wrapper):hover {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.filter-input :deep(.el-input__wrapper.is-focus),
.filter-select :deep(.el-input__wrapper.is-focus),
.filter-date-picker :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}
</style>
