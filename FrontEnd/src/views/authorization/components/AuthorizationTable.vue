<template>
  <div class="authorization-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="用户信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="user-info" v-if="row.user">
            <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(row.user.email) }">
              {{ getAvatarText(row.user.email) }}
            </div>
            <div class="user-details">
              <div class="user-email">{{ row.user.email || row.user.phone || '-' }}</div>
              <div class="user-id" v-if="row.userId">{{ row.userId }}</div>
            </div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="模型信息" min-width="250">
        <template #default="{ row }">
          <div class="model-info" v-if="row.model">
            <div class="model-name">{{ row.model.displayName || row.model.name }}</div>
            <div class="model-subtitle">
              <span v-if="row.model.provider">{{ row.model.provider.displayName || row.model.provider.name }}</span>
              <span v-else>{{ row.model.name }}</span>
            </div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="设备指纹" min-width="180">
        <template #default="{ row }">
          <div class="device-info">
            <el-icon><Monitor /></el-icon>
            <span class="device-text">{{ row.deviceFingerprint || '-' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="IP地址" width="140" align="center">
        <template #default="{ row }">
          <span class="text-muted">{{ row.ipAddress || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="冻结额度" width="120" align="center">
        <template #default="{ row }">
          <span class="quota-text">{{ formatQuota(row.frozenQuota) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="调用令牌" min-width="200">
        <template #default="{ row }">
          <div v-if="row.callToken" class="token-info">
            <el-tooltip :content="row.callToken" placement="top">
              <span class="token-text">{{ truncateToken(row.callToken) }}</span>
            </el-tooltip>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="过期时间" width="160" align="center">
        <template #default="{ row }">
          <div v-if="row.expiresAt">
            <span :class="['time-text', isExpired(row) ? 'expired-time' : '']">
              {{ formatDateTime(row.expiresAt) }}
            </span>
            <el-tag v-if="isExpired(row)" type="danger" size="small" style="margin-left: 4px">
              已过期
            </el-tag>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="请求ID" min-width="150">
        <template #default="{ row }">
          <span class="text-muted">{{ row.requestId || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="160" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              :disabled="row.status === 'revoked'"
              @click="handleRevoke(row)"
              title="撤销授权"
            />
            <el-button
              type="primary"
              :icon="View"
              circle
              size="small"
              @click="handleView(row)"
              title="查看详情"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Delete, View, Monitor } from '@element-plus/icons-vue'

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

const emit = defineEmits(['revoke', 'view'])

// 获取头像文字（取邮箱前两个字符）
function getAvatarText(email) {
  if (!email) return '??'
  return email.substring(0, 2).toUpperCase()
}

// 根据邮箱生成头像颜色
function getAvatarColor(email) {
  const colors = [
    '#8b5cf6', // 紫色
    '#ef4444', // 红色
    '#f59e0b', // 橙色
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#ec4899'  // 粉色
  ]
  if (!email) return colors[0]
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
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
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 格式化额度
function formatQuota(quota) {
  if (quota === null || quota === undefined) return '-'
  return parseFloat(quota).toFixed(2)
}

// 截断令牌显示
function truncateToken(token) {
  if (!token) return '-'
  if (token.length <= 20) return token
  return token.substring(0, 10) + '...' + token.substring(token.length - 10)
}

// 获取状态类型
function getStatusType(status) {
  const statusMap = {
    active: 'success',
    revoked: 'danger',
    expired: 'warning',
    used: 'info'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    active: '活跃',
    revoked: '已撤销',
    expired: '已过期',
    used: '已使用'
  }
  return statusMap[status] || status
}

// 判断是否已过期
function isExpired(row) {
  if (!row.expiresAt) return false
  const now = new Date()
  const expiresAt = new Date(row.expiresAt)
  return expiresAt <= now
}

// 撤销授权
function handleRevoke(row) {
  emit('revoke', row)
}

// 查看详情
function handleView(row) {
  emit('view', row)
}
</script>

<style scoped>
.authorization-table {
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

.model-info {
  display: flex;
  flex-direction: column;
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.model-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-text {
  font-size: 13px;
  color: #64748b;
  word-break: break-all;
}

.token-info {
  display: flex;
  align-items: center;
}

.token-text {
  font-size: 12px;
  color: #64748b;
  font-family: monospace;
  cursor: pointer;
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.expired-time {
  color: #ef4444;
  font-weight: 600;
}

.text-muted {
  color: #94a3b8;
  font-size: 13px;
}

.quota-text {
  font-size: 13px;
  color: #f59e0b;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
