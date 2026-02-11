<template>
  <div class="device-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" align="center" />
      
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

      <el-table-column label="设备信息" min-width="250">
        <template #default="{ row }">
          <div class="device-info">
            <div class="device-name">{{ row.name || '未命名设备' }}</div>
            <div class="device-fingerprint">{{ row.deviceFingerprint }}</div>
            <div class="device-id" v-if="row.id">ID: {{ row.id }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="IP地址" width="140" align="center">
        <template #default="{ row }">
          <span class="text-normal">{{ row.ipAddress || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="地区" width="120" align="center">
        <template #default="{ row }">
          <span class="text-normal">{{ row.region || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', row.status === 'active' ? 'status-active' : 'status-revoked']">
            <el-icon class="status-icon">
              <component :is="row.status === 'active' ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span class="status-text">{{ row.status === 'active' ? '活跃' : '已撤销' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="最后使用时间" width="160" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.lastUsedAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="160" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="备注" min-width="150">
        <template #default="{ row }">
          <span class="text-normal">{{ row.remark || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="250" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              :icon="Edit"
              circle
              size="small"
              @click="handleEdit(row)"
              title="编辑设备"
            />
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              :icon="Lock"
              circle
              size="small"
              @click="handleRevoke(row)"
              title="解绑设备"
            />
            <el-button
              v-else
              type="success"
              :icon="Unlock"
              circle
              size="small"
              @click="handleAllow(row)"
              title="恢复设备"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="handleDelete(row)"
              title="删除设备"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Edit, Delete, Lock, Unlock, CircleCheck, CircleClose } from '@element-plus/icons-vue'

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

const emit = defineEmits(['edit', 'revoke', 'allow', 'delete', 'selection-change'])

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

// 编辑设备
function handleEdit(row) {
  emit('edit', row)
}

// 解绑设备
function handleRevoke(row) {
  emit('revoke', row)
}

// 恢复设备
function handleAllow(row) {
  emit('allow', row)
}

// 删除设备
function handleDelete(row) {
  emit('delete', row)
}

// 选择变化
function handleSelectionChange(selection) {
  emit('selection-change', selection)
}
</script>

<style scoped>
.device-table {
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

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.device-fingerprint {
  font-size: 12px;
  color: #64748b;
  word-break: break-all;
}

.device-id {
  font-size: 11px;
  color: #94a3b8;
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.text-normal {
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

.status-revoked {
  border-color: #ef4444;
  color: #ef4444;
}

.status-revoked .status-icon {
  color: #ef4444;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  line-height: 1;
}
</style>
