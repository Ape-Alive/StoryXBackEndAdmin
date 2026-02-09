<template>
  <div class="price-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="模型名称" width="180" align="center">
        <template #default="{ row }">
          <span class="model-name">{{ row.model?.displayName || row.model?.name || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="计价类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.pricingType === 'token' ? 'primary' : 'success'" size="small">
            {{ row.pricingType === 'token' ? '按Token计价' : '按调用次数计价' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="套餐" width="150" align="center">
        <template #default="{ row }">
          <span class="package-name">{{ row.packageId ? (row.package?.displayName || row.package?.name || '套餐') : '默认价格' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="输入Token单价" width="140" align="center" v-if="showTokenPrices">
        <template #default="{ row }">
          <span class="price-value">{{ formatPrice(row.inputPrice) }}</span>
          <span class="price-unit">积分</span>
        </template>
      </el-table-column>

      <el-table-column label="输出Token单价" width="140" align="center" v-if="showTokenPrices">
        <template #default="{ row }">
          <span class="price-value">{{ formatPrice(row.outputPrice) }}</span>
          <span class="price-unit">积分</span>
        </template>
      </el-table-column>

      <el-table-column label="最大Token数" width="120" align="center" v-if="showTokenPrices">
        <template #default="{ row }">
          <span class="token-value">{{ row.maxToken || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="调用次数单价" width="140" align="center" v-if="showCallPrice">
        <template #default="{ row }">
          <span class="price-value">{{ formatPrice(row.callPrice) }}</span>
          <span class="price-unit">积分</span>
        </template>
      </el-table-column>

      <el-table-column label="生效时间" width="180" align="center">
        <template #default="{ row }">
          <span class="date-text">{{ formatDateTime(row.effectiveAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="过期时间" width="180" align="center">
        <template #default="{ row }">
          <span class="date-text">{{ row.expiredAt ? formatDateTime(row.expiredAt) : '永久有效' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="180" align="center">
        <template #default="{ row }">
          <span class="date-text">{{ formatDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              :icon="Edit"
              circle
              size="small"
              @click="handleEdit(row)"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="handleDelete(row)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  tableData: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete'])

// 判断是否显示Token价格列
const showTokenPrices = computed(() => {
  return props.tableData.some(item => item.pricingType === 'token')
})

// 判断是否显示调用次数价格列
const showCallPrice = computed(() => {
  return props.tableData.some(item => item.pricingType === 'call')
})

// 格式化价格
function formatPrice(price) {
  if (price === null || price === undefined) return '0.00'
  const num = parseFloat(price)
  if (isNaN(num)) return '0.00'
  return num.toFixed(6)
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 编辑
function handleEdit(row) {
  emit('edit', row)
}

// 删除
function handleDelete(row) {
  emit('delete', row)
}
</script>

<style scoped>
.price-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.model-name {
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

.package-name {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.price-unit {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 4px;
}

.date-text {
  font-size: 13px;
  color: #64748b;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>

