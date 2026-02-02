<template>
  <el-dialog
    v-model="dialogVisible"
    :title="formData.id ? '编辑分类' : '创建分类'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="right"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入分类名称（唯一标识，如 code_assistant）"
          :disabled="!!formData.id"
        />
        <div class="form-tip">分类名称不可修改，用于系统内部标识</div>
      </el-form-item>

      <el-form-item label="显示名称" prop="displayName">
        <el-input v-model="formData.displayName" placeholder="请输入显示名称（如 代码助手）" />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入分类描述（可选）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  category: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  id: null,
  name: '',
  displayName: '',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }]
}

watch(() => props.category, (val) => {
  if (val) {
    formData.id = val.id
    formData.name = val.name || ''
    formData.displayName = val.displayName || ''
    formData.description = val.description || ''
  } else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  formData.id = null
  formData.name = ''
  formData.displayName = ''
  formData.description = ''
  formRef.value?.clearValidate()
}

function handleClose() {
  dialogVisible.value = false
  resetForm()
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const data = {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || null
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
