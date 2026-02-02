<template>
  <el-dialog
    v-model="dialogVisible"
    title="提示词详情"
    width="900px"
    @close="handleClose"
  >
    <div v-if="prompt" class="prompt-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="功能键">
          <span class="function-key-text">{{ prompt.functionKey || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="标题">
          {{ prompt.title }}
        </el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">
          <div class="content-text">{{ prompt.content }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="描述">
          {{ prompt.description || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ prompt.category?.displayName || prompt.category?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getTypeTagType(prompt.type)" size="small">
            {{ getTypeLabel(prompt.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="prompt.isActive ? 'success' : 'danger'" size="small">
            {{ prompt.isActive ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="版本">
          v{{ prompt.version }}
        </el-descriptions-item>
        <el-descriptions-item label="版本总数">
          {{ prompt.versionCount || 0 }}
        </el-descriptions-item>
        <el-descriptions-item v-if="prompt.system" label="关联系统提示词" :span="2">
          <div class="system-link">
            <span>{{ prompt.system.title }}</span>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleViewSystem(prompt.system.id)"
            >
              查看
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item v-if="prompt.children && prompt.children.length > 0" label="关联子提示词" :span="2">
          <div class="children-list">
            <el-tag
              v-for="child in prompt.children"
              :key="child.id"
              :type="getTypeTagType(child.type)"
              size="small"
              style="margin-right: 8px; margin-bottom: 8px"
            >
              {{ child.title }}
            </el-tag>
          </div>
        </el-descriptions-item>
        <el-descriptions-item v-if="prompt.tags && prompt.tags.length > 0" label="标签" :span="2">
          <el-tag
            v-for="tag in prompt.tags"
            :key="tag"
            size="small"
            style="margin-right: 8px"
          >
            {{ tag }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateTime(prompt.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDateTime(prompt.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
    <div v-else class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button
        v-if="prompt && canEdit"
        type="primary"
        @click="handleEdit"
      >
        编辑
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getPromptById } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  promptId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'edit', 'view-system'])

const authStore = useAuthStore()
const prompt = ref(null)
const loading = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const canEdit = computed(() => {
  if (!prompt.value) return false
  const adminRoles = ['super_admin', 'platform_admin', 'operator', 'risk_control', 'finance']
  const isAdmin = adminRoles.includes(authStore.user?.role)
  if (isAdmin) return true
  if (prompt.value.type === 'user' && prompt.value.userId === authStore.user?.id) return true
  return false
})

watch(() => props.promptId, async (val) => {
  if (val && dialogVisible.value) {
    await loadPrompt()
  }
}, { immediate: true })

watch(dialogVisible, async (val) => {
  if (val && props.promptId) {
    await loadPrompt()
  } else {
    prompt.value = null
  }
})

async function loadPrompt() {
  if (!props.promptId) return
  loading.value = true
  try {
    const response = await getPromptById(props.promptId)
    if (response.success) {
      prompt.value = response.data
      // 解析tags
      if (prompt.value.tags && typeof prompt.value.tags === 'string') {
        try {
          prompt.value.tags = JSON.parse(prompt.value.tags)
        } catch {
          prompt.value.tags = []
        }
      }
    }
  } catch (error) {
    console.error('加载提示词详情失败', error)
  } finally {
    loading.value = false
  }
}

function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function getTypeTagType(type) {
  const typeMap = {
    system: 'danger',
    system_user: 'warning',
    user: 'success'
  }
  return typeMap[type] || 'info'
}

function getTypeLabel(type) {
  const labelMap = {
    system: '系统提示词',
    system_user: '系统用户提示词',
    user: '用户提示词'
  }
  return labelMap[type] || type
}

function handleClose() {
  dialogVisible.value = false
}

function handleEdit() {
  emit('edit', prompt.value)
  handleClose()
}

function handleViewSystem(id) {
  emit('view-system', id)
}
</script>

<style scoped>
.prompt-detail {
  padding: 10px 0;
}

.content-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}

.system-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.children-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.loading-container {
  padding: 20px;
}

.function-key-text {
  font-size: 14px;
  color: #0f172a;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}
</style>
