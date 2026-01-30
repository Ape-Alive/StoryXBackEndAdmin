<template>
  <el-dialog
    v-model="visible"
    title="延期用户套餐"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="left"
    >
      <el-form-item label="当前过期时间">
        <div class="info-text">
          {{ currentExpiresAt ? formatDate(currentExpiresAt) : '永久有效' }}
        </div>
      </el-form-item>

      <el-form-item label="延期天数" prop="days">
        <el-input-number
          v-model="formData.days"
          :min="1"
          :max="3650"
          placeholder="请输入延期天数"
          style="width: 100%"
        />
        <div class="form-tip">延期后过期时间：{{ newExpiresAt }}</div>
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
import { ref, reactive, watch, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  userPackage: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const visible = ref(props.modelValue)
const submitting = ref(false)

const formData = reactive({
  days: 30
})

const rules = {
  days: [
    { required: true, message: '请输入延期天数', trigger: 'blur' },
    { type: 'number', min: 1, max: 3650, message: '延期天数必须在1-3650天之间', trigger: 'blur' }
  ]
}

const currentExpiresAt = computed(() => {
  return props.userPackage?.expiresAt
})

const newExpiresAt = computed(() => {
  if (!formData.days || formData.days <= 0) return '-'
  const baseDate = currentExpiresAt ? new Date(currentExpiresAt) : new Date()
  const newDate = new Date(baseDate)
  newDate.setDate(newDate.getDate() + formData.days)
  return formatDate(newDate)
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    resetForm()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function resetForm() {
  formData.days = 30
  formRef.value?.clearValidate()
}

function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleClose() {
  visible.value = false
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true
      emit('success', {
        id: props.userPackage?.id,
        days: formData.days
      })
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.info-text {
  font-size: 14px;
  color: #0f172a;
  font-weight: 500;
}

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
