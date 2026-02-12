<template>
  <div class="aicall-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="用户信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="user-info" v-if="row.user">
            <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(row.user.email || row.user.userId) }">
              {{ getAvatarText(row.user.email || row.user.phone) }}
            </div>
            <div class="user-details">
              <div class="user-email">{{ row.user.email || row.user.phone || '-' }}</div>
              <div class="user-id" v-if="row.userId">{{ row.userId }}</div>
            </div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="请求ID" min-width="180">
        <template #default="{ row }">
          <span class="request-id">{{ row.requestId }}</span>
        </template>
      </el-table-column>

      <el-table-column label="模型" min-width="140">
        <template #default="{ row }">
          <div class="model-info" v-if="row.model">
            <div class="model-name">{{ row.model.displayName || row.model.name || row.modelId }}</div>
            <div class="model-provider" v-if="row.model.provider">{{ row.model.provider.displayName || row.model.provider.name }}</div>
          </div>
          <span v-else class="text-muted">{{ row.modelId }}</span>
        </template>
      </el-table-column>

      <el-table-column label="Token" width="120" align="center">
        <template #default="{ row }">
          <span class="token-text">{{ row.totalTokens ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="成本" width="90" align="center">
        <template #default="{ row }">
          <span class="cost-text">{{ formatCost(row.cost) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', row.status === 'success' ? 'status-success' : 'status-failure']">
            <el-icon class="status-icon">
              <component :is="row.status === 'success' ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span class="status-text">{{ row.status === 'success' ? '成功' : '失败' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="耗时(ms)" width="100" align="center">
        <template #default="{ row }">
          <span class="text-normal">{{ row.duration ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="请求时间" width="160" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.requestTime) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" :icon="View" link size="small" @click="handleView(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { View, CircleCheck, CircleClose } from '@element-plus/icons-vue'

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

function getAvatarText(str) {
  if (!str) return '?'
  if (str.includes('@')) return str.substring(0, 1).toUpperCase()
  return str.substring(0, 2).toUpperCase()
}

function getAvatarColor(str) {
  const colors = ['#8b5cf6', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899']
  if (!str) return colors[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatCost(val) {
  if (val == null || val === '') return '-'
  return Number(val).toFixed(4)
}

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

function handleView(row) {
  emit('view', row)
}
</script>

<style scoped>
.aicall-table {
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

.user-id {
  font-size: 12px;
  color: #94a3b8;
}

.request-id {
  font-size: 13px;
  color: #64748b;
  word-break: break-all;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.model-provider {
  font-size: 12px;
  color: #94a3b8;
}

.token-text,
.cost-text {
  font-size: 13px;
  color: #64748b;
}

.time-text,
.text-normal {
  font-size: 13px;
  color: #64748b;
}

.text-muted {
  color: #94a3b8;
  font-size: 13px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid;
  background: white;
  font-size: 13px;
  font-weight: 500;
}

.status-success {
  border-color: #10b981;
  color: #10b981;
}

.status-success .status-icon {
  color: #10b981;
}

.status-failure {
  border-color: #ef4444;
  color: #ef4444;
}

.status-failure .status-icon {
  color: #ef4444;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  line-height: 1;
}
</style>
