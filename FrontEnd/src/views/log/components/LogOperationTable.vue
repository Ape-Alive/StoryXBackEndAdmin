<template>
  <div class="operation-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="管理员" min-width="180" fixed="left">
        <template #default="{ row }">
          <div class="admin-info" v-if="row.admin">
            <div class="admin-avatar" :style="{ backgroundColor: getAvatarColor(row.admin.email || row.admin.username) }">
              {{ getAvatarText(row.admin.email || row.admin.username) }}
            </div>
            <div class="admin-details">
              <div class="admin-name">{{ row.admin.username || '-' }}</div>
              <div class="admin-id" v-if="row.adminId">{{ row.adminId }}</div>
            </div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="操作类型" min-width="160">
        <template #default="{ row }">
          <span class="action-text">{{ row.action || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="目标类型" width="120">
        <template #default="{ row }">
          <span class="target-type">{{ row.targetType || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="目标ID" min-width="140">
        <template #default="{ row }">
          <span class="target-id">{{ row.targetId || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="结果" width="100" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', row.result === 'success' ? 'status-success' : 'status-failure']">
            <el-icon class="status-icon">
              <component :is="row.result === 'success' ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span class="status-text">{{ row.result === 'success' ? '成功' : '失败' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="IP地址" width="130">
        <template #default="{ row }">
          <span class="text-normal">{{ row.ipAddress || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作时间" width="170" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
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
.operation-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-avatar {
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

.admin-details {
  flex: 1;
  min-width: 0;
}

.admin-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.admin-id {
  font-size: 12px;
  color: #94a3b8;
}

.action-text,
.target-type,
.target-id {
  font-size: 13px;
  color: #64748b;
  word-break: break-all;
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
