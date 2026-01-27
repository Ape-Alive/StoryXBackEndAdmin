<template>
  <div class="price-filter">
    <el-select
      :model-value="pricingType"
      @update:model-value="handlePricingTypeChange"
      placeholder="计价类型"
      clearable
      class="filter-select"
      @change="handleFilterChange"
    >
      <el-option label="按Token计价" value="token" />
      <el-option label="按调用次数计价" value="call" />
    </el-select>
    <el-select
      :model-value="packageId"
      @update:model-value="handlePackageIdChange"
      placeholder="套餐筛选"
      clearable
      filterable
      class="filter-select"
      @change="handleFilterChange"
    >
      <el-option
        v-for="pkg in packages"
        :key="pkg.id"
        :label="pkg.displayName || pkg.name"
        :value="pkg.id"
      />
    </el-select>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPackages } from '@/api/package'

const props = defineProps({
  pricingType: {
    type: String,
    default: ''
  },
  packageId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:pricingType', 'update:packageId', 'search'])

const packages = ref([])

function handlePricingTypeChange(val) {
  emit('update:pricingType', val)
}

function handlePackageIdChange(val) {
  emit('update:packageId', val)
}

function handleFilterChange() {
  emit('search')
}

// 获取套餐列表
async function fetchPackages() {
  try {
    const response = await getPackages({ page: 1, pageSize: 1000 })
    if (response.success) {
      packages.value = response.data || []
    }
  } catch (error) {
    console.error('获取套餐列表失败', error)
  }
}

onMounted(() => {
  fetchPackages()
})
</script>

<style scoped>
.price-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  width: 180px;
}
</style>

