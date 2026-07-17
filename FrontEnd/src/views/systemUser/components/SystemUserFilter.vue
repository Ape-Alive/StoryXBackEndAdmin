<template>
  <div class="system-user-filter">
    <el-input
      v-model="localFilters.username"
      placeholder="按用户名搜索..."
      clearable
      class="filter-input"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <el-input
      v-model="localFilters.email"
      placeholder="按邮箱搜索..."
      clearable
      class="filter-input"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Message /></el-icon>
      </template>
    </el-input>
    <el-select
      v-model="localFilters.role"
      placeholder="选择角色"
      clearable
      class="filter-select"
      @change="handleSearch"
    >
      <el-option label="全部角色" value="" />
      <el-option
        v-for="role in roleOptions"
        :key="role.roleKey"
        :label="role.name"
        :value="role.roleKey"
      />
    </el-select>
    <el-select
      v-model="localFilters.status"
      placeholder="选择状态"
      clearable
      class="filter-select"
      @change="handleSearch"
    >
      <el-option label="全部状态" value="" />
      <el-option label="已启用" value="active" />
      <el-option label="已禁用" value="inactive" />
    </el-select>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search, Message } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      username: '',
      email: '',
      role: '',
      status: ''
    })
  },
  roleOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const localFilters = ref({
  username: props.modelValue.username || '',
  email: props.modelValue.email || '',
  role: props.modelValue.role || '',
  status: props.modelValue.status || ''
})

watch(() => props.modelValue, (val) => {
  localFilters.value = {
    username: val.username || '',
    email: val.email || '',
    role: val.role || '',
    status: val.status || ''
  }
}, { deep: true })

watch(localFilters, (val) => {
  emit('update:modelValue', val)
}, { deep: true })

function handleSearch() {
  emit('search', localFilters.value)
}
</script>

<style scoped>
.system-user-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-input {
  max-width: 200px;
}

.filter-select {
  width: 150px;
}
</style>

