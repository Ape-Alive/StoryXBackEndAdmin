<template>
  <el-dialog
    v-model="visible"
    :title="formData.id ? '编辑价格' : '新增价格'"
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
      <el-form-item label="计价类型" prop="pricingType">
        <el-select
          v-model="formData.pricingType"
          placeholder="请选择计价类型"
          style="width: 100%"
          @change="handlePricingTypeChange"
        >
          <el-option label="按Token计价" value="token" />
          <el-option label="按调用次数计价" value="call" />
        </el-select>
      </el-form-item>

      <el-form-item label="套餐" prop="packageId">
        <el-select
          v-model="formData.packageId"
          placeholder="请选择套餐（留空表示默认价格）"
          style="width: 100%"
          clearable
          filterable
          :loading="packagesLoading"
        >
          <el-option
            v-for="pkg in packages"
            :key="pkg.id"
            :label="pkg.displayName || pkg.name"
            :value="pkg.id"
          />
        </el-select>
        <div class="form-tip">留空表示默认价格，适用于所有套餐</div>
      </el-form-item>

      <template v-if="formData.pricingType === 'token'">
        <el-form-item label="输入Token单价" prop="inputPrice">
          <el-input-number
            v-model="formData.inputPrice"
            :min="0"
            :precision="6"
            :step="0.000001"
            placeholder="请输入输入Token单价"
            style="width: 100%"
          />
          <div class="form-tip">单位：积分</div>
        </el-form-item>

        <el-form-item label="输出Token单价" prop="outputPrice">
          <el-input-number
            v-model="formData.outputPrice"
            :min="0"
            :precision="6"
            :step="0.000001"
            placeholder="请输入输出Token单价"
            style="width: 100%"
          />
          <div class="form-tip">单位：积分</div>
        </el-form-item>
      </template>

      <template v-if="formData.pricingType === 'call'">
        <el-form-item label="调用次数单价" prop="callPrice">
          <el-input-number
            v-model="formData.callPrice"
            :min="0"
            :precision="2"
            :step="0.01"
            placeholder="请输入调用次数单价"
            style="width: 100%"
          />
          <div class="form-tip">单位：积分</div>
        </el-form-item>
      </template>

      <el-form-item label="生效时间" prop="effectiveAt">
        <el-date-picker
          v-model="formData.effectiveAt"
          type="datetime"
          placeholder="选择生效时间"
          style="width: 100%"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
        />
      </el-form-item>

      <el-form-item label="过期时间">
        <el-date-picker
          v-model="formData.expiredAt"
          type="datetime"
          placeholder="选择过期时间（可选）"
          style="width: 100%"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
        />
        <div class="form-tip">留空表示永久有效</div>
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
import { getPackages } from '@/api/package'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  price: {
    type: Object,
    default: null
  },
  modelId: {
    type: String,
    required: false,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue || false)
const formRef = ref(null)
const submitting = ref(false)
const packages = ref([])
const packagesLoading = ref(false)

const formData = reactive({
  pricingType: 'token',
  packageId: '',
  inputPrice: 0,
  outputPrice: 0,
  callPrice: 0,
  effectiveAt: '',
  expiredAt: ''
})

const rules = {
  pricingType: [
    { required: true, message: '请选择计价类型', trigger: 'change' }
  ],
  inputPrice: [
    { required: true, message: '请输入输入Token单价', trigger: 'blur', validator: (rule, value, callback) => {
      if (formData.pricingType === 'token' && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入输入Token单价'))
      } else {
        callback()
      }
    }}
  ],
  outputPrice: [
    { required: true, message: '请输入输出Token单价', trigger: 'blur', validator: (rule, value, callback) => {
      if (formData.pricingType === 'token' && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入输出Token单价'))
      } else {
        callback()
      }
    }}
  ],
  callPrice: [
    { required: true, message: '请输入调用次数单价', trigger: 'blur', validator: (rule, value, callback) => {
      if (formData.pricingType === 'call' && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入调用次数单价'))
      } else {
        callback()
      }
    }}
  ],
  effectiveAt: [
    { required: true, message: '请选择生效时间', trigger: 'change' }
  ]
}

// 获取套餐列表
async function fetchPackages() {
  packagesLoading.value = true
  try {
    const response = await getPackages({ page: 1, pageSize: 1000 })
    if (response.success) {
      packages.value = response.data || []
    }
  } catch (error) {
    ElMessage.error('获取套餐列表失败')
  } finally {
    packagesLoading.value = false
  }
}

// 计价类型变化
function handlePricingTypeChange() {
  // 重置价格字段
  if (formData.pricingType === 'token') {
    formData.callPrice = 0
  } else {
    formData.inputPrice = 0
    formData.outputPrice = 0
  }
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.price) {
    Object.assign(formData, {
      id: props.price.id,
      pricingType: props.price.pricingType || 'token',
      packageId: props.price.packageId || '',
      inputPrice: props.price.inputPrice !== undefined ? parseFloat(props.price.inputPrice) : 0,
      outputPrice: props.price.outputPrice !== undefined ? parseFloat(props.price.outputPrice) : 0,
      callPrice: props.price.callPrice !== undefined ? parseFloat(props.price.callPrice) : 0,
      effectiveAt: props.price.effectiveAt || '',
      expiredAt: props.price.expiredAt || ''
    })
  } else if (val) {
    // 重置表单
    Object.assign(formData, {
      id: null,
      pricingType: 'token',
      packageId: '',
      inputPrice: 0,
      outputPrice: 0,
      callPrice: 0,
      effectiveAt: '',
      expiredAt: ''
    })
  }
}, { immediate: true })

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (val) {
    fetchPackages()
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
      // 处理日期格式，确保是 ISO 8601 格式
      let effectiveAt = formData.effectiveAt
      if (effectiveAt && !effectiveAt.includes('T')) {
        // 如果不是 ISO 格式，转换为 ISO 格式
        effectiveAt = new Date(effectiveAt).toISOString()
      } else if (!effectiveAt) {
        effectiveAt = new Date().toISOString()
      }

      let expiredAt = formData.expiredAt || null
      if (expiredAt && !expiredAt.includes('T')) {
        expiredAt = new Date(expiredAt).toISOString()
      }

      const submitData = {
        ...formData,
        modelId: props.modelId, // 确保包含 modelId
        packageId: formData.packageId || null,
        effectiveAt: effectiveAt,
        expiredAt: expiredAt
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

onMounted(() => {
  fetchPackages()
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

