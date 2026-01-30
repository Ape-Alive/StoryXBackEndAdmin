<template>
  <div class="quota-filter">
    <div class="filter-group">
      <label class="filter-label">用户ID</label>
      <el-input
        v-model="localFilters.userId"
        placeholder="请输入用户ID"
        clearable
        class="filter-input"
        @input="handleSearch"
      />
    </div>
    <div class="filter-group">
      <label class="filter-label">套餐ID</label>
      <el-input
        v-model="localFilters.packageId"
        placeholder="请输入套餐ID"
        clearable
        class="filter-input"
        @input="handleSearch"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      userId: '',
      packageId: ''
    })
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const localFilters = ref({
  userId: props.modelValue.userId || '',
  packageId: props.modelValue.packageId || ''
})

watch(() => props.modelValue, (val) => {
  localFilters.value = {
    userId: val.userId || '',
    packageId: val.packageId || ''
  }
}, { deep: true })

watch(localFilters, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })

function handleSearch() {
  emit('search', localFilters.value)
}
</script>

<style scoped>
.quota-filter {
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

.filter-input :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  transition: all 0.2s;
}

.filter-input :deep(.el-input__wrapper):hover {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.filter-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}
</style>
