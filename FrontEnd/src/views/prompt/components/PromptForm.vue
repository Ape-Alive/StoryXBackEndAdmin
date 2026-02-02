<template>
  <el-dialog
    v-model="dialogVisible"
    :title="formData.id ? '编辑提示词' : '创建提示词'"
    width="800px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="right"
    >
      <el-form-item label="功能键" prop="functionKey">
        <el-input
          v-model="formData.functionKey"
          placeholder="请输入功能键（唯一标识，如 code_generator）"
          :disabled="!!formData.id"
        />
        <div class="form-tip">功能键不可修改，用于系统内部唯一标识</div>
      </el-form-item>

      <el-form-item label="标题" prop="title">
        <el-input v-model="formData.title" placeholder="请输入提示词标题" />
      </el-form-item>

      <el-form-item label="内容" prop="content">
        <el-input
          v-model="formData.content"
          type="textarea"
          :rows="8"
          placeholder="请输入提示词内容"
        />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入提示词描述（可选）"
        />
      </el-form-item>

      <el-form-item label="分类" prop="categoryId">
        <el-select
          v-model="formData.categoryId"
          placeholder="请选择分类"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.displayName"
            :value="category.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="类型" prop="type">
        <el-select
          v-model="formData.type"
          placeholder="请选择类型"
          style="width: 100%"
          :disabled="
            !!formData.id ||
            props.promptType === 'system' ||
            props.promptType === 'system_user' ||
            props.promptType === 'user'
          "
        >
          <el-option label="系统提示词" value="system" :disabled="!isAdmin" />
          <el-option label="系统用户提示词" value="system_user" :disabled="!isAdmin" />
          <el-option label="用户提示词" value="user" :disabled="isAdmin" />
        </el-select>
      </el-form-item>

      <el-form-item
        v-if="formData.type === 'system_user' || formData.type === 'user'"
        label="关联系统提示词"
        prop="systemId"
      >
        <el-select
          v-model="formData.systemId"
          placeholder="请选择关联的系统提示词"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="prompt in systemPrompts"
            :key="prompt.id"
            :label="prompt.title"
            :value="prompt.id"
          />
        </el-select>
        <div class="form-tip">用户提示词必须关联一个系统提示词</div>
      </el-form-item>

      <el-form-item label="标签" prop="tags">
        <el-select
          v-model="formData.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请输入标签，按回车添加"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="状态" prop="isActive">
        <el-switch v-model="formData.isActive" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting"> 确定 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { getPromptCategories, getPrompts } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  prompt: {
    type: Object,
    default: null
  },
  promptType: {
    type: String,
    default: '' // system, system_user, user
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const authStore = useAuthStore()
const isAdmin = computed(() => {
  const adminRoles = ['super_admin', 'platform_admin', 'operator', 'risk_control', 'finance']
  return adminRoles.includes(authStore.user?.role)
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const formRef = ref(null)
const submitting = ref(false)
const categories = ref([])
const systemPrompts = ref([])

const formData = reactive({
  id: null,
  functionKey: '',
  title: '',
  content: '',
  description: '',
  categoryId: '',
  type: props.promptType || '',
  systemId: '',
  tags: [],
  isActive: true
})

// 动态验证规则
const rules = computed(() => {
  const baseRules = {
    functionKey: [{ required: true, message: '请输入功能键', trigger: 'blur' }],
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
    categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
    type: [{ required: true, message: '请选择类型', trigger: 'change' }]
  }

  // 如果是 system_user 或 user 类型，systemId 为必填
  if (formData.type === 'system_user' || formData.type === 'user') {
    baseRules.systemId = [{ required: true, message: '请选择关联的系统提示词', trigger: 'change' }]
  }

  return baseRules
})

// 加载分类列表
async function loadCategories() {
  try {
    const response = await getPromptCategories()
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('加载分类列表失败', error)
  }
}

// 加载系统提示词列表（用于关联）
async function loadSystemPrompts() {
  try {
    const response = await getPrompts({ type: 'system', pageSize: 100 })
    if (response.success) {
      systemPrompts.value = response.data || []
    }
  } catch (error) {
    console.error('加载系统提示词列表失败', error)
  }
}

watch(
  () => props.prompt,
  val => {
    if (val) {
      formData.id = val.id
      formData.functionKey = val.functionKey || ''
      formData.title = val.title || ''
      formData.content = val.content || ''
      formData.description = val.description || ''
      formData.categoryId = val.categoryId || ''
      formData.type = val.type || ''
      formData.systemId = val.systemId || ''
      formData.isActive = val.isActive !== undefined ? val.isActive : true
      try {
        formData.tags = val.tags
          ? typeof val.tags === 'string'
            ? JSON.parse(val.tags)
            : val.tags
          : []
      } catch {
        formData.tags = []
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.promptType,
  val => {
    if (!formData.id && val) {
      formData.type = val
      if (val === 'system_user' || val === 'user') {
        loadSystemPrompts()
      }
    }
  }
)

watch(
  () => formData.type,
  val => {
    if (val === 'system_user' || val === 'user') {
      loadSystemPrompts()
    }
  }
)

function resetForm() {
  formData.id = null
  formData.functionKey = ''
  formData.title = ''
  formData.content = ''
  formData.description = ''
  formData.categoryId = ''
  formData.type = props.promptType || ''
  formData.systemId = ''
  formData.tags = []
  formData.isActive = true
  formRef.value?.clearValidate()
}

function handleClose() {
  dialogVisible.value = false
  resetForm()
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true
      try {
        const data = {
          functionKey: formData.functionKey,
          title: formData.title,
          content: formData.content,
          description: formData.description || null,
          categoryId: formData.categoryId,
          type: formData.type,
          systemId: formData.systemId || null,
          tags: formData.tags,
          isActive: formData.isActive
        }

        emit('success', data)
        handleClose()
      } catch (error) {
        // 错误已在 request.js 中处理
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadCategories()
  if (
    props.promptType === 'system_user' ||
    props.promptType === 'user' ||
    formData.type === 'system_user' ||
    formData.type === 'user'
  ) {
    loadSystemPrompts()
  }
})
</script>

<style scoped>
:deep(.el-dialog__body) {
  padding: 20px;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
