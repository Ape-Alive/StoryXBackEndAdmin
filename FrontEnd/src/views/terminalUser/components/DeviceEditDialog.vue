<template>
  <el-dialog
    v-model="dialogVisible"
    :title="device ? '编辑设备' : '编辑设备'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="left"
    >
      <el-form-item label="设备名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入设备名称（可选，最大50字符）"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注（可选，最大200字符）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="设备状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio label="active">活跃</el-radio>
          <el-radio label="revoked">已撤销</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="设备信息" v-if="device">
        <div class="device-info-readonly">
          <div class="info-item">
            <span class="info-label">设备ID:</span>
            <span class="info-value">{{ device.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备指纹:</span>
            <span class="info-value">{{ device.deviceFingerprint }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">用户ID:</span>
            <span class="info-value">{{ device.userId }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">IP地址:</span>
            <span class="info-value">{{ device.ipAddress || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">地区:</span>
            <span class="info-value">{{ device.region || '-' }}</span>
          </div>
        </div>
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
  device: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = ref(false)
const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  name: '',
  remark: '',
  status: 'active'
})

const rules = {
  name: [
    { max: 50, message: '设备名称不能超过50个字符', trigger: 'blur' }
  ],
  remark: [
    { max: 200, message: '备注不能超过200个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择设备状态', trigger: 'change' }
  ]
}

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val && props.device) {
    formData.name = props.device.name || ''
    formData.remark = props.device.remark || ''
    formData.status = props.device.status || 'active'
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    resetForm()
  }
})

function resetForm() {
  formData.name = ''
  formData.remark = ''
  formData.status = 'active'
  formRef.value?.resetFields()
}

function handleClose() {
  dialogVisible.value = false
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitting.value = true
    
    emit('success', {
      ...formData,
      id: props.device?.id
    })
    
    submitting.value = false
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>

<style scoped>
.device-info-readonly {
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #64748b;
  font-weight: 500;
  min-width: 80px;
  margin-right: 8px;
}

.info-value {
  color: #0f172a;
  word-break: break-all;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
