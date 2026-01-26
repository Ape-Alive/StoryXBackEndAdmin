<template>
  <div class="model-filter">
    <el-input
      :model-value="name"
      @update:model-value="handleNameChange"
      placeholder="按模型名称或显示名称搜索..."
      clearable
      class="search-input"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <el-select
      :model-value="type"
      @update:model-value="handleTypeChange"
      placeholder="模型类型"
      clearable
      class="filter-select"
      @change="handleFilterChange"
    >
      <el-option label="LLM" value="llm" />
      <el-option label="视频" value="video" />
      <el-option label="图片" value="image" />
      <el-option label="TTS" value="tts" />
    </el-select>
    <el-select
      :model-value="isActive"
      @update:model-value="handleStatusChange"
      placeholder="状态"
      clearable
      class="filter-select"
      @change="handleFilterChange"
    >
      <el-option label="已启用" :value="true" />
      <el-option label="已禁用" :value="false" />
    </el-select>
  </div>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: undefined
  }
})

const emit = defineEmits(['update:name', 'update:type', 'update:isActive', 'search'])

function handleNameChange(val) {
  emit('update:name', val)
}

function handleTypeChange(val) {
  emit('update:type', val)
}

function handleStatusChange(val) {
  emit('update:isActive', val)
}

function handleSearch() {
  emit('search')
}

function handleFilterChange() {
  emit('search')
}
</script>

<style scoped>
.model-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  max-width: 300px;
}

.filter-select {
  width: 150px;
}
</style>

