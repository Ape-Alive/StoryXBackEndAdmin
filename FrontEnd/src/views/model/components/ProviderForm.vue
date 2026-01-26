<template>
  <el-dialog
    v-model="visible"
    :title="formData.id ? '编辑提供商' : '新增提供商'"
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
      <el-form-item label="提供商标识" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="例如：DeepSeek"
          :disabled="!!formData.id"
        />
        <div class="form-tip">唯一标识，创建后不可修改</div>
      </el-form-item>

      <el-form-item label="显示名称" prop="displayName">
        <el-input
          v-model="formData.displayName"
          placeholder="例如：DeepSeek AI"
        />
      </el-form-item>

      <el-form-item label="API 服务基地址" prop="baseUrl">
        <el-input
          v-model="formData.baseUrl"
          placeholder="例如：https://api.deepseek.com"
        />
      </el-form-item>

      <el-form-item label="官网链接" prop="website">
        <el-input
          v-model="formData.website"
          placeholder="例如：https://www.deepseek.com"
        />
      </el-form-item>

      <el-form-item label="Logo 链接" prop="logoUrl">
        <el-input
          v-model="formData.logoUrl"
          placeholder="Logo 图片 URL"
        />
      </el-form-item>

      <el-form-item label="描述信息">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="提供商描述信息"
        />
      </el-form-item>

      <el-form-item label="额度" prop="quota">
        <el-input-number
          v-model="formData.quota"
          :min="0"
          :precision="2"
          placeholder="请输入额度"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="额度单位" prop="quotaUnit">
        <el-select
          v-model="formData.quotaUnit"
          placeholder="请选择额度单位"
          style="width: 100%"
        >
          <el-option label="积分" value="points" />
          <el-option label="元" value="yuan" />
          <el-option label="美元" value="usd" />
        </el-select>
      </el-form-item>

      <el-form-item label="账户Token" prop="mainAccountToken">
        <el-input
          v-model="formData.mainAccountToken"
          type="textarea"
          :rows="2"
          placeholder="请输入主账户token"
        />
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
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  provider: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  name: '',
  displayName: '',
  baseUrl: '',
  website: '',
  logoUrl: '',
  description: '',
  quota: null,
  quotaUnit: null,
  mainAccountToken: '',
  isActive: true
})

const rules = {
  name: [
    { required: true, message: '请输入提供商标识', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_.-]+$/, message: '标识只能包含字母、数字、下划线、点号和连字符', trigger: 'blur' }
  ],
  displayName: [
    { required: true, message: '请输入显示名称', trigger: 'blur' }
  ],
  baseUrl: [
    { required: true, message: '请输入 API 服务基地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ],
  website: [
    { required: true, message: '请输入官网链接', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ],
  logoUrl: [
    { required: true, message: '请输入 Logo 链接', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ],
  quota: [
    { required: true, message: '请输入额度', trigger: 'blur' },
    { type: 'number', min: 0, message: '额度必须大于等于0', trigger: 'blur' }
  ],
  quotaUnit: [
    { required: true, message: '请选择额度单位', trigger: 'change' }
  ],
  mainAccountToken: [
    { required: true, message: '请输入账户Token', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.provider) {
    Object.assign(formData, {
      id: props.provider.id,
      name: props.provider.name || '',
      displayName: props.provider.displayName || '',
      baseUrl: props.provider.baseUrl || '',
      website: props.provider.website || '',
      logoUrl: props.provider.logoUrl || '',
      description: props.provider.description || '',
      quota: props.provider.quota !== undefined && props.provider.quota !== null ? parseFloat(props.provider.quota) : null,
      quotaUnit: props.provider.quotaUnit || null,
      mainAccountToken: props.provider.mainAccountToken || '',
      isActive: props.provider.isActive !== undefined ? props.provider.isActive : true
    })
  } else if (val) {
    // 重置表单
    Object.assign(formData, {
      id: null,
      name: '',
      displayName: '',
      baseUrl: '',
      website: '',
      logoUrl: '',
      description: '',
      quota: null,
      quotaUnit: null,
      mainAccountToken: '',
      isActive: true
    })
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

function handleSubmit() {
  formRef.value?.validate((valid) => {
    if (valid) {
      submitting.value = true
      // 处理数据，确保 quota 为 null 或数字
      const submitData = {
        ...formData,
        quota: formData.quota !== null && formData.quota !== undefined ? formData.quota : null,
        quotaUnit: formData.quotaUnit || null,
        mainAccountToken: formData.mainAccountToken || null
      }
      emit('success', submitData)
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

