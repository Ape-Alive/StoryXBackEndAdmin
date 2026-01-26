<template>
  <div class="model-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="模型信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="model-info">
            <div class="model-avatar" :style="{ backgroundColor: getAvatarColor(row.name) }">
              {{ getAvatarText(row.name) }}
            </div>
            <div class="model-details">
              <div class="model-name">{{ row.displayName || row.name }}</div>
              <div class="model-subtitle">{{ row.name }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="提供商" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="provider-name">{{ row.provider?.displayName || row.provider?.name || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="模型类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="分类" width="120" align="center">
        <template #default="{ row }">
          <span class="category-text">{{ row.category || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="接口路径" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="base-url">{{ row.baseUrl }}</span>
        </template>
      </el-table-column>

      <el-table-column label="需要密钥" width="100" align="center">
        <template #default="{ row }">
          <el-icon v-if="row.requiresKey" class="key-icon">
            <Key />
          </el-icon>
          <span v-else class="no-key">-</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <div :class="['status-badge', row.isActive ? 'status-enabled' : 'status-disabled']">
            <el-icon class="status-icon">
              <component :is="row.isActive ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span class="status-text">{{ row.isActive ? '已启用' : '已禁用' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="120" align="center">
        <template #default="{ row }">
          <span class="create-time">{{ formatDate(row.createdAt) }}</span>
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
              @click="handleDelete(row)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Edit, Delete, CircleCheck, CircleClose, Key } from '@element-plus/icons-vue'

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
function getAvatarText(name) {
  if (!name) return '??'
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// 根据名称生成头像颜色
function getAvatarColor(name) {
  const colors = [
    '#8b5cf6', // 紫色
    '#ef4444', // 红色
    '#f59e0b', // 橙色
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#ec4899'  // 粉色
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 获取类型标签
function getTypeLabel(type) {
  const typeMap = {
    llm: 'LLM',
    video: '视频',
    image: '图片',
    tts: 'TTS'
  }
  return typeMap[type] || type
}

// 获取类型标签样式
function getTypeTagType(type) {
  const typeMap = {
    llm: 'primary',
    video: 'success',
    image: 'warning',
    tts: 'info'
  }
  return typeMap[type] || ''
}

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
.model-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-avatar {
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

.model-details {
  flex: 1;
  min-width: 0;
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

.provider-name {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.category-text {
  font-size: 13px;
  color: #64748b;
}

.base-url {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #64748b;
}

.key-icon {
  color: #f59e0b;
  font-size: 18px;
}

.no-key {
  color: #94a3b8;
  font-size: 13px;
}

.create-time {
  font-size: 13px;
  color: #64748b;
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

