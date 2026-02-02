<template>
  <div class="category-table">
    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%"
      :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
    >
      <el-table-column label="分类名称" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="category-info">
            <div class="category-name">{{ row.displayName }}</div>
            <div class="category-id">{{ row.name }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="描述" min-width="250">
        <template #default="{ row }">
          <span class="description-text">{{ row.description || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="提示词数量" width="120" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row._count?.prompts || 0 }}</el-tag>
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

      <el-table-column label="操作" width="150" align="center" fixed="right">
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
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="handleDelete(row)"
              title="删除"
              :disabled="(row._count?.prompts || 0) > 0"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Edit, Delete } from '@element-plus/icons-vue'

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

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function handleEdit(row) {
  emit('edit', row)
}

function handleDelete(row) {
  emit('delete', row)
}
</script>

<style scoped>
.category-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.category-info {
  display: flex;
  flex-direction: column;
}

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.category-id {
  font-size: 12px;
  color: #94a3b8;
}

.description-text {
  font-size: 13px;
  color: #64748b;
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
