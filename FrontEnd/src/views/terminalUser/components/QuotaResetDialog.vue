<template>
  <el-dialog
    v-model="visible"
    title="重置额度"
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
      <el-form-item label="当前可用">
        <el-input :value="formatNumber(quota?.available)" disabled />
      </el-form-item>
      <el-form-item label="当前冻结">
        <el-input :value="formatNumber(quota?.frozen)" disabled />
      </el-form-item>
      <el-form-item label="当前已用">
        <el-input :value="formatNumber(quota?.used)" disabled />
      </el-form-item>
      <el-form-item label="重置原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          placeholder="请输入重置原因（必填）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-alert
        title="警告"
        type="warning"
        :closable="false"
        style="margin-bottom: 0"
      >
        <template #default>
          重置后，可用额度、冻结额度和已用额度都将清零，此操作不可恢复！
        </template>
      </el-alert>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="danger" @click="handleSubmit" :loading="loading">确定重置</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { resetQuota } from '@/api/quota'

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
  reason: ''
})

const rules = {
  reason: [
    { required: true, message: '请输入重置原因', trigger: 'blur' },
    { max: 500, message: '原因不能超过500个字符', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.quota) {
    form.reason = ''
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  const n = parseFloat(num)
  if (isNaN(n)) return '0'
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      ElMessageBox.confirm(
        '确定要重置额度吗？重置后所有额度将清零，此操作不可恢复！',
        '确认重置',
        {
          confirmButtonText: '确定重置',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        loading.value = true
        try {
          const response = await resetQuota(props.quota.id, {
            reason: form.reason
          })
          if (response.success) {
            ElMessage.success('重置成功')
            emit('success')
            handleClose()
          }
        } catch (error) {
          // 错误已在 request.js 中处理
        } finally {
          loading.value = false
        }
      }).catch(() => {})
    }
  })
}
</script>
