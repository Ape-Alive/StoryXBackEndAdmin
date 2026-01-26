<template>
  <div class="provider-filter">
    <el-input
      v-model="searchKeyword"
      placeholder="按名称过滤..."
      clearable
      class="search-input"
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const searchKeyword = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  searchKeyword.value = val
})

watch(searchKeyword, (val) => {
  emit('update:modelValue', val)
})

function handleSearch() {
  emit('search', searchKeyword.value)
}
</script>

<style scoped>
.provider-filter {
  margin-bottom: 16px;
}

.search-input {
  max-width: 300px;
}
</style>

