<template>
  <div class="quota-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="用户信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="user-info">
            <div
              class="user-avatar"
              :style="{ backgroundColor: getAvatarColor(row.user?.email || row.userId) }"
            >
              {{ getAvatarText(row.user?.email || row.userId) }}
            </div>
            <div class="user-details">
              <div class="user-email">{{ row.user?.email || '-' }}</div>
              <div class="user-phone">{{ row.user?.phone || '-' }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="套餐" min-width="150">
        <template #default="{ row }">
          <span v-if="row.package?.displayName" class="package-name">{{
            row.package.displayName
          }}</span>
          <span v-else class="package-empty">默认额度</span>
        </template>
      </el-table-column>

      <el-table-column label="可用额度" width="120" align="right">
        <template #default="{ row }">
          <span class="quota-value available">{{ formatNumber(row.available) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="冻结额度" width="120" align="right">
        <template #default="{ row }">
          <span class="quota-value frozen">{{ formatNumber(row.frozen) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="已用额度" width="120" align="right">
        <template #default="{ row }">
          <span class="quota-value used">{{ formatNumber(row.used) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="总额度" width="120" align="right">
        <template #default="{ row }">
          <span class="quota-value total">{{ formatNumber(getTotalQuota(row)) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="更新时间" width="160" align="center">
        <template #default="{ row }">
          <span class="update-time">{{ formatDate(row.updatedAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="280" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button type="primary" size="small" @click="handleAdjust(row)">调整</el-button>
            <el-button type="warning" size="small" @click="handleFreeze(row)">冻结</el-button>
            <el-button type="success" size="small" @click="handleUnfreeze(row)">解冻</el-button>
            <el-button type="info" size="small" @click="handleSet(row)">设置</el-button>
            <el-button type="danger" size="small" @click="handleReset(row)">重置</el-button>
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

const emit = defineEmits(['adjust', 'freeze', 'unfreeze', 'set', 'reset'])

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
    '#ec4899' // 粉色
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

// 计算总额度
function getTotalQuota(row) {
  const available = parseFloat(row.available || 0)
  const frozen = parseFloat(row.frozen || 0)
  const used = parseFloat(row.used || 0)
  return available + frozen + used
}

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 操作处理
function handleAdjust(row) {
  emit('adjust', row)
}

function handleFreeze(row) {
  emit('freeze', row)
}

function handleUnfreeze(row) {
  emit('unfreeze', row)
}

function handleSet(row) {
  emit('set', row)
}

function handleReset(row) {
  emit('reset', row)
}
</script>

<style scoped>
.quota-table {
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

.quota-value {
  font-size: 14px;
  font-weight: 600;
}

.quota-value.available {
  color: #10b981;
}

.quota-value.frozen {
  color: #f59e0b;
}

.quota-value.used {
  color: #64748b;
}

.quota-value.total {
  color: #3b82f6;
}

.update-time {
  font-size: 13px;
  color: #64748b;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
