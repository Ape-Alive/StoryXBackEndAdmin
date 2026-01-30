<template>
  <div class="quota-record-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column label="用户信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="user-info" v-if="row.user">
            <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(row.user.email || row.userId) }">
              {{ getAvatarText(row.user.email || row.userId) }}
            </div>
            <div class="user-details">
              <div class="user-email">{{ row.user.email || '-' }}</div>
              <div class="user-phone">{{ row.user.phone || '-' }}</div>
            </div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="套餐" min-width="150">
        <template #default="{ row }">
          <span v-if="row.package?.displayName" class="package-name">{{ row.package.displayName }}</span>
          <span v-else class="package-empty">默认额度</span>
        </template>
      </el-table-column>

      <el-table-column label="流水类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="变动金额" width="120" align="right">
        <template #default="{ row }">
          <span :class="['amount-value', getAmountClass(row.type)]">
            {{ getAmountPrefix(row.type) }}{{ formatNumber(row.amount) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="变动前" width="120" align="right">
        <template #default="{ row }">
          <span class="quota-value">{{ formatNumber(row.before) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="变动后" width="120" align="right">
        <template #default="{ row }">
          <span class="quota-value">{{ formatNumber(row.after) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="订单ID" width="180">
        <template #default="{ row }">
          <span v-if="row.orderId" class="order-id">{{ row.orderId }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="请求ID" width="180">
        <template #default="{ row }">
          <span v-if="row.requestId" class="request-id">{{ row.requestId }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="变动原因" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.reason" class="reason-text">{{ row.reason }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="160" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
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

const emit = defineEmits(['view', 'delete', 'selection-change'])

// 获取头像文字
function getAvatarText(text) {
  if (!text) return '??'
  if (text.includes('@')) {
    return text.substring(0, 2).toUpperCase()
  }
  return text.substring(0, 2).toUpperCase()
}

// 根据文本生成头像颜色
function getAvatarColor(text) {
  const colors = [
    '#8b5cf6', // 紫色
    '#ef4444', // 红色
    '#f59e0b', // 橙色
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#ec4899'  // 粉色
  ]
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 格式化数字
function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  const n = parseFloat(num)
  if (isNaN(n)) return '0'
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 获取类型标签类型
function getTypeTagType(type) {
  const typeMap = {
    increase: 'success',
    decrease: 'danger',
    freeze: 'warning',
    unfreeze: 'info'
  }
  return typeMap[type] || ''
}

// 获取类型标签
function getTypeLabel(type) {
  const typeMap = {
    increase: '增加',
    decrease: '减少',
    freeze: '冻结',
    unfreeze: '解冻'
  }
  return typeMap[type] || type
}

// 获取金额前缀
function getAmountPrefix(type) {
  if (type === 'increase' || type === 'unfreeze') {
    return '+'
  }
  return '-'
}

// 获取金额样式类
function getAmountClass(type) {
  if (type === 'increase' || type === 'unfreeze') {
    return 'amount-positive'
  }
  return 'amount-negative'
}

// 选择变化
function handleSelectionChange(selection) {
  emit('selection-change', selection.map(item => item.id))
}

// 查看详情
function handleView(row) {
  emit('view', row)
}

// 删除
function handleDelete(row) {
  emit('delete', row)
}
</script>

<style scoped>
.quota-record-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-email {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.user-phone {
  font-size: 12px;
  color: #94a3b8;
}

.package-name {
  font-size: 14px;
  color: #0f172a;
}

.package-empty {
  font-size: 14px;
  color: #94a3b8;
}

.amount-value {
  font-size: 14px;
  font-weight: 600;
}

.amount-positive {
  color: #10b981;
}

.amount-negative {
  color: #ef4444;
}

.quota-value {
  font-size: 14px;
  color: #64748b;
}

.order-id,
.request-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #64748b;
}

.reason-text {
  font-size: 13px;
  color: #64748b;
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.text-muted {
  font-size: 13px;
  color: #94a3b8;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}
</style>
