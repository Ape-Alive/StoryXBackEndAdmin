<template>
  <el-dialog
    v-model="visible"
    title="冻结额度"
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
      <el-form-item label="当前可用" prop="currentAvailable">
        <el-input :value="formatNumber(quota?.available)" disabled />
      </el-form-item>
      <el-form-item label="冻结金额" prop="amount">
        <el-input-number
          v-model="form.amount"
          :precision="2"
          :step="1"
          :min="0.01"
          :max="parseFloat(quota?.available || 0)"
          style="width: 100%"
          placeholder="请输入冻结金额"
        />
        <div class="form-tip">冻结后可用: {{ formatNumber(getNewAvailable()) }}</div>
      </el-form-item>
      <el-form-item label="冻结原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          placeholder="请输入冻结原因"
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
import { freezeQuota } from '@/api/quota'

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
  amount: 0,
  reason: ''
})

const rules = {
  amount: [
    { required: true, message: '请输入冻结金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '冻结金额必须大于0', trigger: 'blur' }
  ],
  reason: [
    { max: 500, message: '原因不能超过500个字符', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.quota) {
    form.amount = 0
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

function getNewAvailable() {
  const current = parseFloat(props.quota?.available || 0)
  const freeze = parseFloat(form.amount || 0)
  return Math.max(0, current - freeze)
}

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const currentAvailable = parseFloat(props.quota?.available || 0)
      if (form.amount > currentAvailable) {
        ElMessage.error('冻结金额不能超过可用额度')
        return
      }
      loading.value = true
      try {
        const response = await freezeQuota(props.quota.id, {
          amount: form.amount,
          reason: form.reason
        })
        if (response.success) {
          ElMessage.success('冻结成功')
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

<style scoped>
.form-tip {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}
</style>
