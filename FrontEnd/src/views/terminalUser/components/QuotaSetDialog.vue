<template>
  <el-dialog
    v-model="visible"
    title="设置额度"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="用户">
        <el-input :value="quota?.user?.email || quota?.userId" disabled />
      </el-form-item>
      <el-form-item label="套餐">
        <el-input :value="quota?.package?.displayName || '默认额度'" disabled />
      </el-form-item>
      <el-form-item label="可用额度" prop="available">
        <el-input-number
          v-model="form.available"
          :precision="2"
          :step="1"
          :min="0"
          style="width: 100%"
          placeholder="请输入可用额度"
        />
      </el-form-item>
      <el-form-item label="冻结额度" prop="frozen">
        <el-input-number
          v-model="form.frozen"
          :precision="2"
          :step="1"
          :min="0"
          style="width: 100%"
          placeholder="请输入冻结额度"
        />
      </el-form-item>
      <el-form-item label="已用额度" prop="used">
        <el-input-number
          v-model="form.used"
          :precision="2"
          :step="1"
          :min="0"
          style="width: 100%"
          placeholder="请输入已用额度"
        />
      </el-form-item>
      <el-form-item label="设置原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          placeholder="请输入设置原因（必填）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { setQuota } from '@/api/quota'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  quota: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  available: null,
  frozen: null,
  used: null,
  reason: ''
})

const rules = {
  reason: [
    { required: true, message: '请输入设置原因', trigger: 'blur' },
    { max: 500, message: '原因不能超过500个字符', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.quota) {
    form.available = parseFloat(props.quota.available || 0)
    form.frozen = parseFloat(props.quota.frozen || 0)
    form.used = parseFloat(props.quota.used || 0)
    form.reason = ''
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const data = {
          reason: form.reason
        }
        if (form.available !== null) data.available = form.available
        if (form.frozen !== null) data.frozen = form.frozen
        if (form.used !== null) data.used = form.used

        const response = await setQuota(props.quota.id, data)
        if (response.success) {
          ElMessage.success('设置成功')
          emit('success')
          handleClose()
        }
      } catch (error) {
        // 错误已在 request.js 中处理
      } finally {
        loading.value = false
      }
    }
  })
}
</script>
