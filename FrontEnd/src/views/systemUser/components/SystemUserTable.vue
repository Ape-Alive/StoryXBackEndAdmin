<template>
  <div class="system-user-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="管理员信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="admin-info">
            <div class="admin-avatar" :style="{ backgroundColor: getAvatarColor(row.username) }">
              {{ getAvatarText(row.username) }}
            </div>
            <div class="admin-details">
              <div class="admin-name">{{ row.username }}</div>
              <div class="admin-subtitle">{{ row.email }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="角色" width="150" align="center">
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)" size="small">
            {{ getRoleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', row.status === 'active' ? 'status-enabled' : 'status-disabled']">
            <el-icon class="status-icon">
              <component :is="row.status === 'active' ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span class="status-text">{{ row.status === 'active' ? '已启用' : '已禁用' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="最后登录" width="180" align="center">
        <template #default="{ row }">
          <span class="last-login">{{ formatDate(row.lastLogin) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="120" align="center">
        <template #default="{ row }">
          <span class="create-time">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作日志" width="100" align="center">
        <template #default="{ row }">
          <span class="log-count">{{ row.operationLogCount || 0 }}</span>
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
              :disabled="row.role === 'super_admin'"
              @click="handleDelete(row)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Edit, Delete, CircleCheck, CircleClose } from '@element-plus/icons-vue'

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

// 获取头像文字（取前两个字符）
function getAvatarText(username) {
  if (!username) return '??'
  const words = username.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return username.substring(0, 2).toUpperCase()
}

// 根据用户名生成头像颜色
function getAvatarColor(username) {
  const colors = [
    '#8b5cf6', // 紫色
    '#ef4444', // 红色
    '#f59e0b', // 橙色
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#ec4899'  // 粉色
  ]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 获取角色标签类型
function getRoleTagType(role) {
  const roleTypeMap = {
    super_admin: 'danger',
    platform_admin: 'warning',
    operator: 'primary',
    risk_control: 'success',
    finance: 'info',
    read_only: ''
  }
  return roleTypeMap[role] || ''
}

// 获取角色标签文本
function getRoleLabel(role) {
  const roleLabelMap = {
    super_admin: '超级管理员',
    platform_admin: '平台管理员',
    operator: '运营人员',
    risk_control: '风控人员',
    finance: '财务人员',
    read_only: '只读角色'
  }
  return roleLabelMap[role] || role
}

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
.system-user-table {
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

.admin-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.last-login,
.create-time {
  font-size: 13px;
  color: #64748b;
}

.log-count {
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
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

.status-enabled {
  border-color: #10b981;
  color: #10b981;
}

.status-enabled .status-icon {
  color: #10b981;
}

.status-disabled {
  border-color: #ef4444;
  color: #ef4444;
}

.status-disabled .status-icon {
  color: #ef4444;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  line-height: 1;
}
</style>

