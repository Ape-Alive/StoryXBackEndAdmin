<template>
  <el-dialog
    v-model="visible"
    title="AI 调用日志详情"
    width="560px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-if="log" class="detail-content">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="请求ID">{{ log.requestId }}</el-descriptions-item>
        <el-descriptions-item label="日志类型">
          <el-tag :type="log.logType === 'voice_clone' ? 'warning' : 'info'" effect="plain">
            {{ log.logType === 'voice_clone' ? '声音复刻' : '模型调用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ log.user?.email || log.user?.phone || '-' }} ({{ log.userId }})
        </el-descriptions-item>
        <el-descriptions-item label="模型">
          {{ log.model?.displayName || log.model?.name || log.modelId }}
          <span v-if="log.model?.provider" class="provider-tag">{{ log.model.provider.displayName || log.model.provider.name }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="输入Token" v-if="log.logType !== 'voice_clone'">{{ log.inputTokens ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="输出Token" v-if="log.logType !== 'voice_clone'">{{ log.outputTokens ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="总Token" v-if="log.logType !== 'voice_clone'">{{ log.totalTokens ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="成本">{{ formatCost(log.cost) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="log.status === 'success' ? 'success' : 'danger'">{{ log.status === 'success' ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="复刻流水状态" v-if="log.logType === 'voice_clone'">
          {{ log.cloneStatus || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="音色ID" v-if="log.logType === 'voice_clone'">{{ log.voiceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="音色记录ID" v-if="log.logType === 'voice_clone'">{{ log.voiceProfileId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="API Key ID" v-if="log.logType === 'voice_clone'">{{ log.userApiKeyId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="扣费前已用积分" v-if="log.logType === 'voice_clone'">
          {{ formatCost(log.usedCreditsBefore) }}
        </el-descriptions-item>
        <el-descriptions-item label="扣费后已用积分" v-if="log.logType === 'voice_clone'">
          {{ formatCost(log.usedCreditsAfter) }}
        </el-descriptions-item>
        <el-descriptions-item label="请求时间">{{ formatDateTime(log.requestTime) }}</el-descriptions-item>
        <el-descriptions-item label="响应时间">{{ formatDateTime(log.responseTime) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ log.duration != null ? log.duration + ' ms' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备指纹" v-if="log.logType !== 'voice_clone'">{{ log.deviceFingerprint || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP地址" v-if="log.logType !== 'voice_clone'">{{ log.ipAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="错误信息" v-if="log.logType !== 'voice_clone' && log.status === 'failure'">
          <span class="error-text">{{ log.errorMessage || '-' }}</span>
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

function formatCost(val) {
  if (val == null || val === '') return '-'
  return Number(val).toFixed(4)
}

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

function handleClose() {
  visible.value = false
}
</script>

<style scoped>
.detail-content {
  padding: 0 8px;
}

.provider-tag {
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
}

.error-text {
  color: #ef4444;
  font-size: 13px;
}
</style>
