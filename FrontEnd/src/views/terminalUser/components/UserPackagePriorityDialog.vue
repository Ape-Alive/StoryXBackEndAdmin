<template>
  <el-dialog
    v-model="visible"
    title="修改套餐优先级"
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
      <el-form-item label="当前优先级">
        <div class="info-text">
          {{ currentPriority }}
        </div>
      </el-form-item>

      <el-form-item label="新优先级" prop="priority">
        <el-input-number
          v-model="formData.priority"
          :min="0"
          :max="100"
          placeholder="请输入优先级（0-100）"
          style="width: 100%"
        />
        <div class="form-tip">数字越大优先级越高，范围：0-100</div>
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
  priority: 0
})

const rules = {
  priority: [
    { required: true, message: '请输入优先级', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优先级必须在0-100之间', trigger: 'blur' }
  ]
}

const currentPriority = computed(() => {
  return props.userPackage?.priority || 0
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
  formData.priority = currentPriority.value
  formRef.value?.clearValidate()
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
        priority: formData.priority
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
