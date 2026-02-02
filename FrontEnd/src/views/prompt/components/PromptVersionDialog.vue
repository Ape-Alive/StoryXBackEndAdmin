<template>
  <el-dialog
    v-model="dialogVisible"
    title="版本历史"
    width="800px"
    @close="handleClose"
  >
    <div v-if="versions.length > 0" class="version-list">
      <el-timeline>
        <el-timeline-item
          v-for="version in versions"
          :key="version.id"
          :timestamp="formatDateTime(version.createdAt)"
          placement="top"
        >
          <el-card>
            <div class="version-header">
              <div>
                <el-tag type="info" size="small">版本 {{ version.version }}</el-tag>
                <span v-if="version.updatedBy" class="updated-by">
                  更新者: {{ version.updatedBy }}
                </span>
              </div>
              <el-button
                v-if="version.version !== currentVersion"
                type="primary"
                size="small"
                @click="handleRollback(version.version)"
              >
                回滚到此版本
              </el-button>
            </div>
            <div class="version-content">{{ version.content }}</div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
    <div v-else class="empty-state">
      <el-empty description="暂无版本记录" />
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPromptVersions, rollbackPrompt } from '@/api/prompt'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  promptId: {
    type: String,
    default: ''
  },
  currentVersion: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['update:modelValue', 'rollback-success'])

const versions = ref([])
const loading = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

watch(() => props.promptId, async (val) => {
  if (val && dialogVisible.value) {
    await loadVersions()
  }
}, { immediate: true })

watch(dialogVisible, async (val) => {
  if (val && props.promptId) {
    await loadVersions()
  } else {
    versions.value = []
  }
})

async function loadVersions() {
  if (!props.promptId) return
  loading.value = true
  try {
    const response = await getPromptVersions(props.promptId)
    if (response.success) {
      versions.value = response.data || []
    }
  } catch (error) {
    ElMessage.error('加载版本列表失败')
  } finally {
    loading.value = false
  }
}

function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

async function handleRollback(version) {
  try {
    await ElMessageBox.confirm(
      `确定要回滚到版本 ${version} 吗？\n\n` +
      `⚠️ 注意：回滚操作只会恢复提示词的内容（content），标题、分类、描述等其他字段不会回滚。\n\n` +
      `当前版本会自动保存到版本历史中。`,
      '确认回滚',
      {
        confirmButtonText: '确定回滚',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await rollbackPrompt(props.promptId, { version })
    if (response.success) {
      ElMessage.success('回滚成功')
      emit('rollback-success')
      handleClose()
    }
  } catch (error) {
    if (error !== 'cancel') {
      // 错误已在 request.js 中处理
    }
  }
}

function handleClose() {
  dialogVisible.value = false
}
</script>

<style scoped>
.version-list {
  max-height: 600px;
  overflow-y: auto;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.updated-by {
  margin-left: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.version-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #64748b;
  max-height: 200px;
  overflow-y: auto;
}

.empty-state {
  padding: 40px 0;
}
</style>
