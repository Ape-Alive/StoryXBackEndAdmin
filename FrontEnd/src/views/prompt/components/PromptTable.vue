<template>
  <div class="prompt-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="功能键" width="150" fixed="left">
        <template #default="{ row }">
          <div class="function-key-text">{{ row.functionKey || '-' }}</div>
        </template>
      </el-table-column>

      <el-table-column label="标题" min-width="200">
        <template #default="{ row }">
          <div class="title-info">
            <div class="title-text">{{ row.title }}</div>
            <div class="title-id" v-if="row.id">{{ row.id.substring(0, 12) }}...</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="分类" min-width="150">
        <template #default="{ row }">
          <div class="category-info" v-if="row.category">
            <div class="category-name">{{ row.category.displayName || row.category.name }}</div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="类型" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="关联系统提示词" min-width="180">
        <template #default="{ row }">
          <div v-if="row.system" class="system-info">
            <div class="system-title">{{ row.system.title }}</div>
            <div class="system-id">{{ row.system.id.substring(0, 12) }}...</div>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="版本" width="100" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">v{{ row.version }}</el-tag>
          <div v-if="row.versionCount" class="version-count">共{{ row.versionCount }}个版本</div>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="120" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="更新时间" width="120" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ formatDate(row.updatedAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              :icon="View"
              circle
              size="small"
              @click="handleView(row)"
              title="查看详情"
            />
            <el-button
              v-if="canEdit(row)"
              type="warning"
              :icon="Edit"
              circle
              size="small"
              @click="handleEdit(row)"
              title="编辑"
            />
            <el-button
              v-if="row.versionCount > 0"
              type="info"
              :icon="Clock"
              circle
              size="small"
              @click="handleVersions(row)"
              title="版本历史"
            />
            <el-button
              v-if="canDelete(row)"
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="handleDelete(row)"
              title="删除"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { View, Edit, Delete, Clock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  tableData: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  userRole: {
    type: String,
    default: ''
  },
  userId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['view', 'edit', 'delete', 'versions'])

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 获取类型标签类型
function getTypeTagType(type) {
  const typeMap = {
    system: 'danger',
    system_user: 'warning',
    user: 'success'
  }
  return typeMap[type] || 'info'
}

// 获取类型标签文本
function getTypeLabel(type) {
  const labelMap = {
    system: '系统提示词',
    system_user: '系统用户提示词',
    user: '用户提示词'
  }
  return labelMap[type] || type
}

// 判断是否可以编辑
function canEdit(row) {
  // 管理员可以编辑所有
  const adminCheck = isAdmin()
  if (adminCheck) return true
  // 终端用户只能编辑自己的user类型
  if (row.type === 'user' && row.userId === props.userId) return true
  return false
}

// 判断是否可以删除
function canDelete(row) {
  // 管理员可以删除所有
  if (isAdmin()) return true
  // 终端用户只能删除自己的user类型
  if (row.type === 'user' && row.userId === props.userId) return true
  return false
}

// 判断是否是管理员
function isAdmin() {
  // 直接从 authStore 获取角色，确保响应式更新
  const authStore = useAuthStore()
  const role = authStore.user?.role || authStore.admin?.role || props.userRole || ''
  if (!role) return false
  const adminRoles = [
    'super_admin',
    'platform_admin',
    'operator',
    'risk_control',
    'finance',
    'read_only'
  ]
  return adminRoles.includes(String(role).trim())
}

function handleView(row) {
  emit('view', row)
}

function handleEdit(row) {
  emit('edit', row)
}

function handleDelete(row) {
  emit('delete', row)
}

function handleVersions(row) {
  emit('versions', row)
}
</script>

<style scoped>
.prompt-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.title-info {
  display: flex;
  flex-direction: column;
}

.title-text {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.title-id {
  font-size: 12px;
  color: #94a3b8;
}

.category-info {
  display: flex;
  flex-direction: column;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.system-info {
  display: flex;
  flex-direction: column;
}

.system-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  margin-bottom: 2px;
}

.system-id {
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

.function-key-text {
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.version-count {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
