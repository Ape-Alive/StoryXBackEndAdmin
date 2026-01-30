<template>
  <div class="order-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="订单号" min-width="180" fixed="left">
        <template #default="{ row }">
          <span class="order-no">{{ row.orderNo }}</span>
        </template>
      </el-table-column>

      <el-table-column label="用户信息" min-width="200">
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

      <el-table-column label="套餐信息" min-width="180">
        <template #default="{ row }">
          <div class="package-info" v-if="row.package">
            <div class="package-name">{{ row.package.displayName || row.package.name }}</div>
            <div class="package-subtitle">{{ row.package.name }}</div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="订单类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="订单状态" width="120" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', getStatusClass(row.status)]">
            <el-icon class="status-icon">
              <component :is="getStatusIcon(row.status)" />
            </el-icon>
            <span class="status-text">{{ getStatusLabel(row.status) }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="订单金额" width="120" align="right">
        <template #default="{ row }">
          <div class="amount-info">
            <div v-if="row.discount && row.discount > 0" class="original-amount">
              ¥{{ formatNumber(row.amount) }}
            </div>
            <div class="final-amount">¥{{ formatNumber(row.finalAmount) }}</div>
            <div v-if="row.discount && row.discount > 0" class="discount-tag">
              折扣{{ row.discount }}%
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="160" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="支付时间" width="160" align="center">
        <template #default="{ row }">
          <span v-if="row.paidAt" class="time-text">{{ formatDateTime(row.paidAt) }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="handleView(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { CircleCheck, CircleClose, Clock, Warning } from '@element-plus/icons-vue'

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

const emit = defineEmits(['view'])

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
  if (num === null || num === undefined) return '0.00'
  const n = parseFloat(num)
  if (isNaN(n)) return '0.00'
  return n.toFixed(2)
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 获取订单类型标签类型
function getTypeTagType(type) {
  const typeMap = {
    purchase: 'success',
    renewal: 'info',
    upgrade: 'warning'
  }
  return typeMap[type] || ''
}

// 获取订单类型标签
function getTypeLabel(type) {
  const typeMap = {
    purchase: '购买',
    renewal: '续费',
    upgrade: '升级'
  }
  return typeMap[type] || type
}

// 获取状态样式类
function getStatusClass(status) {
  const statusMap = {
    pending: 'status-pending',
    paid: 'status-paid',
    cancelled: 'status-cancelled',
    refunded: 'status-refunded',
    expired: 'status-expired'
  }
  return statusMap[status] || ''
}

// 获取状态图标
function getStatusIcon(status) {
  const iconMap = {
    pending: Clock,
    paid: CircleCheck,
    cancelled: CircleClose,
    refunded: Warning,
    expired: CircleClose
  }
  return iconMap[status] || CircleClose
}

// 获取状态标签
function getStatusLabel(status) {
  const statusMap = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消',
    refunded: '已退款',
    expired: '已过期'
  }
  return statusMap[status] || status
}

// 查看详情
function handleView(row) {
  emit('view', row)
}
</script>

<style scoped>
.order-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.order-no {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
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

.package-info {
  flex: 1;
  min-width: 0;
}

.package-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.package-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.amount-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.original-amount {
  font-size: 12px;
  color: #94a3b8;
  text-decoration: line-through;
}

.final-amount {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.discount-tag {
  font-size: 11px;
  color: #10b981;
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.text-muted {
  font-size: 13px;
  color: #94a3b8;
}

/* 状态样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-icon {
  font-size: 14px;
}

.status-pending {
  background: #fef3c7;
  color: #f59e0b;
}

.status-paid {
  background: #d1fae5;
  color: #10b981;
}

.status-cancelled {
  background: #fee2e2;
  color: #ef4444;
}

.status-refunded {
  background: #e0e7ff;
  color: #6366f1;
}

.status-expired {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
