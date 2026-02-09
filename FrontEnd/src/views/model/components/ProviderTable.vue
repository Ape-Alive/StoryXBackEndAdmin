<template>
  <div class="provider-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="提供商信息" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="provider-info">
            <div class="provider-avatar" :style="{ backgroundColor: getAvatarColor(row.name) }">
              {{ getAvatarText(row.name) }}
            </div>
            <div class="provider-details">
              <div class="provider-name">{{ row.displayName || row.name }}</div>
              <div class="provider-subtitle">{{ row.name }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="服务地址 (BASE URL)" min-width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="base-url">{{ row.baseUrl }}</span>
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

      <el-table-column label="额度" width="150" align="center">
        <template #default="{ row }">
          <div class="quota-display">
            <span v-if="row.quota !== null && row.quota !== undefined" class="quota-value">
              {{ formatQuota(row.quota) }}
            </span>
            <span v-else class="quota-empty">-</span>
            <span v-if="row.quotaUnit" class="quota-unit">{{ getQuotaUnitLabel(row.quotaUnit) }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="主账户Token" width="200" align="center">
        <template #default="{ row }">
          <div class="token-display">
            <span v-if="row.mainAccountToken" class="token-text">
              {{ maskToken(row.mainAccountToken) }}
            </span>
            <span v-else class="token-empty">-</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="120" align="center">
        <template #default="{ row }">
          <span class="create-time">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              :icon="Edit"
              circle
              size="small"
              @click="handleEdit(row)"
              title="编辑"
            />
            <el-button
              type="info"
              :icon="Key"
              circle
              size="small"
              @click="handleManageApiKeys(row)"
              title="API Key管理"
            />
            <el-button
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
import { Edit, Delete, CircleCheck, CircleClose, Key } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 格式化额度
function formatQuota(quota) {
  if (quota === null || quota === undefined) return '-'
  const num = parseFloat(quota)
  if (isNaN(num)) return '-'
  // 如果是整数，不显示小数；如果有小数，保留2位
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

// 获取额度单位标签
function getQuotaUnitLabel(unit) {
  const unitMap = {
    points: '积分',
    yuan: '元',
    usd: '美元'
  }
  return unitMap[unit] || unit
}

// 加密显示Token（显示前4位和后4位，中间用*代替）
function maskToken(token) {
  if (!token || token.length === 0) {
    return '-'
  }
  if (token.length <= 8) {
    return '*'.repeat(token.length)
  }
  const prefix = token.substring(0, 4)
  const suffix = token.substring(token.length - 4)
  const middleLength = token.length - 8
  const middle = '*'.repeat(Math.min(middleLength, 12)) // 最多显示12个*
  return `${prefix}${middle}${suffix}`
}

// 编辑
function handleEdit(row) {
  emit('edit', row)
}

// 删除
function handleDelete(row) {
  emit('delete', row)
}

// 管理API Key
function handleManageApiKeys(row) {
  router.push(`/model/provider/${row.id}/api-keys`)
}
</script>

<style scoped>
.provider-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-avatar {
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

.provider-details {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.provider-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.base-url {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #64748b;
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

/* 额度显示 */
.quota-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.quota-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.quota-unit {
  font-size: 13px;
  color: #64748b;
}

.quota-empty {
  color: #94a3b8;
  font-size: 13px;
}

/* Token显示 */
.token-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.token-text {
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #64748b;
  word-break: break-all;
  max-width: 100%;
}

.token-empty {
  color: #94a3b8;
  font-size: 13px;
}
</style>

