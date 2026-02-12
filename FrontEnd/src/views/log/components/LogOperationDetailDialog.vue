<template>
  <el-dialog
    v-model="visible"
    title="操作日志详情"
    width="560px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-if="log" class="detail-content">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="日志ID">{{ log.id }}</el-descriptions-item>
        <el-descriptions-item label="管理员">
          {{ log.admin?.username || '-' }} ({{ log.adminId }})
          <span v-if="log.admin?.email" class="email-tag">{{ log.admin.email }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ log.action || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标类型">{{ log.targetType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标ID">{{ log.targetId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作结果">
          <el-tag :type="log.result === 'success' ? 'success' : 'danger'">{{ log.result === 'success' ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ log.ipAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作时间">{{ formatDateTime(log.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="操作详情" v-if="log.details">
          <pre class="details-pre">{{ formatDetails(log.details) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" v-if="log.result === 'failure' && log.errorMessage">
          <span class="error-text">{{ log.errorMessage }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  log: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatDetails(details) {
  if (!details) return '-'
  try {
    const parsed = typeof details === 'string' ? JSON.parse(details) : details
    return JSON.stringify(parsed, null, 2)
  } catch {
    return details
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped>
.detail-content {
  padding: 0 8px;
}

.email-tag {
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
}

.details-pre {
  margin: 0;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-text {
  color: #ef4444;
  font-size: 13px;
}
</style>
