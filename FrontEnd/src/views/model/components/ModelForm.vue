<template>
  <el-dialog
    v-model="visible"
    :title="formData.id ? '编辑模型' : '新增模型'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="left"
    >
      <el-form-item label="模型标识" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="例如：deepseek-chat"
          :disabled="!!formData.id"
        />
        <div class="form-tip">唯一标识，创建后不可修改</div>
      </el-form-item>

      <el-form-item label="显示名称" prop="displayName">
        <el-input
          v-model="formData.displayName"
          placeholder="例如：DeepSeek Chat"
        />
      </el-form-item>

      <el-form-item label="模型类型" prop="type">
        <el-select
          v-model="formData.type"
          placeholder="请选择模型类型"
          style="width: 100%"
        >
          <el-option label="LLM" value="llm" />
          <el-option label="视频" value="video" />
          <el-option label="图片" value="image" />
          <el-option label="TTS" value="tts" />
        </el-select>
      </el-form-item>

      <el-form-item label="模型分类">
        <el-input
          v-model="formData.category"
          placeholder="例如：chat, completion, generation"
        />
      </el-form-item>

      <el-form-item label="提供商" prop="providerId">
        <el-select
          v-model="formData.providerId"
          placeholder="请选择提供商"
          style="width: 100%"
          filterable
          :loading="providersLoading"
        >
          <el-option
            v-for="provider in providers"
            :key="provider.id"
            :label="provider.displayName || provider.name"
            :value="provider.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="接口路径" prop="baseUrl">
        <el-input
          v-model="formData.baseUrl"
          placeholder="例如：/v1/chat/completions"
        />
      </el-form-item>

      <el-form-item label="描述信息">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="模型描述信息"
        />
      </el-form-item>

      <el-form-item label="API配置" prop="apiConfig">
        <el-input
          v-model="formData.apiConfig"
          type="textarea"
          :rows="4"
          placeholder='请输入JSON格式的API配置，例如：{"temperature": 0.7, "max_tokens": 2000}'
        />
        <div class="form-tip">JSON格式字符串，存储每个模型独有的请求参数</div>
      </el-form-item>

      <el-form-item label="需要API密钥">
        <el-switch v-model="formData.requiresKey" />
      </el-form-item>

      <el-form-item label="是否启用">
        <el-switch v-model="formData.isActive" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProviders } from '@/api/provider'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  model: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const providers = ref([])
const providersLoading = ref(false)

const formData = reactive({
  name: '',
  displayName: '',
  type: '',
  category: '',
  providerId: '',
  baseUrl: '',
  description: '',
  apiConfig: '',
  requiresKey: false,
  isActive: true
})

const rules = {
  name: [
    { required: true, message: '请输入模型标识', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_.-]+$/, message: '标识只能包含字母、数字、下划线、点号和连字符', trigger: 'blur' }
  ],
  displayName: [
    { required: true, message: '请输入显示名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择模型类型', trigger: 'change' }
  ],
  providerId: [
    { required: true, message: '请选择提供商', trigger: 'change' }
  ],
  baseUrl: [
    { required: true, message: '请输入接口路径', trigger: 'blur' }
  ],
  apiConfig: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.trim() === '') {
          callback()
          return
        }
        try {
          JSON.parse(value)
          callback()
        } catch (e) {
          callback(new Error('API配置必须是有效的JSON格式'))
        }
      },
      trigger: 'blur'
    }
  ]
}

// 获取提供商列表
async function fetchProviders() {
  providersLoading.value = true
  try {
    const response = await getProviders({ page: 1, pageSize: 1000 })
    if (response.success) {
      providers.value = response.data || []
    }
  } catch (error) {
    ElMessage.error('获取提供商列表失败')
  } finally {
    providersLoading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.model) {
    Object.assign(formData, {
      id: props.model.id,
      name: props.model.name || '',
      displayName: props.model.displayName || '',
      type: props.model.type || '',
      category: props.model.category || '',
      providerId: props.model.providerId || '',
      baseUrl: props.model.baseUrl || '',
      description: props.model.description || '',
      apiConfig: props.model.apiConfig || '',
      requiresKey: props.model.requiresKey !== undefined ? props.model.requiresKey : false,
      isActive: props.model.isActive !== undefined ? props.model.isActive : true
    })
  } else if (val) {
    // 重置表单
    Object.assign(formData, {
      id: null,
      name: '',
      displayName: '',
      type: '',
      category: '',
      providerId: '',
      baseUrl: '',
      description: '',
      apiConfig: '',
      requiresKey: false,
      isActive: true
    })
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (val) {
    fetchProviders()
  }
})

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

function handleSubmit() {
  formRef.value?.validate((valid) => {
    if (valid) {
      submitting.value = true
      emit('success', { ...formData })
      submitting.value = false
    }
  })
}

// 暴露方法供父组件调用
defineExpose({
  resetForm: () => {
    formRef.value?.resetFields()
  }
})

onMounted(() => {
  fetchProviders()
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

