<template>
  <div class="user-package-table">
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
              <div class="user-email">{{ row.user.email }}</div>
              <div class="user-id" v-if="row.userId">{{ row.userId }}</div>
            </div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="套餐信息" min-width="250">
        <template #default="{ row }">
          <div class="package-info" v-if="row.package">
            <div class="package-name">{{ row.package.displayName || row.package.name }}</div>
            <div class="package-subtitle">{{ row.package.name }}</div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="优先级" width="100" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.priority || 0 }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="开始时间" width="120" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDate(row.startedAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="过期时间" width="120" align="center">
        <template #default="{ row }">
          <span v-if="row.expiresAt" class="time-text">{{ formatDate(row.expiresAt) }}</span>
          <span v-else class="text-muted">永久</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', isActive(row) ? 'status-active' : 'status-inactive']">
            <el-icon class="status-icon">
              <component :is="isActive(row) ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span class="status-text">{{ isActive(row) ? '活跃' : '已过期' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="120" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              :icon="Edit"
              circle
              size="small"
              @click="handleEditPriority(row)"
              title="修改优先级"
            />
            <el-button
              type="warning"
              :icon="Clock"
              circle
              size="small"
              @click="handleExtend(row)"
              title="延期"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="handleCancel(row)"
              title="取消套餐"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Edit, Delete, Clock, CircleCheck, CircleClose } from '@element-plus/icons-vue'

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

const emit = defineEmits(['edit-priority', 'extend', 'cancel'])

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
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 判断套餐是否活跃
function isActive(row) {
  if (!row.startedAt) return false
  const now = new Date()
  const startedAt = new Date(row.startedAt)
  if (startedAt > now) return false
  if (!row.expiresAt) return true
  const expiresAt = new Date(row.expiresAt)
  return expiresAt > now
}

// 修改优先级
function handleEditPriority(row) {
  emit('edit-priority', row)
}

// 延期
function handleExtend(row) {
  emit('extend', row)
}

// 取消套餐
function handleCancel(row) {
  emit('cancel', row)
}
</script>

<style scoped>
.user-package-table {
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

.package-info {
  display: flex;
  flex-direction: column;
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

.time-text {
  font-size: 13px;
  color: #64748b;
}

.text-muted {
  color: #94a3b8;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* 状态样式 */
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

.status-active {
  border-color: #10b981;
  color: #10b981;
}

.status-active .status-icon {
  color: #10b981;
}

.status-inactive {
  border-color: #ef4444;
  color: #ef4444;
}

.status-inactive .status-icon {
  color: #ef4444;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  line-height: 1;
}
</style>
