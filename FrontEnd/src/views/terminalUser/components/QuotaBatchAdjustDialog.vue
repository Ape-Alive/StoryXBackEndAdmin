<template>
  <el-dialog
    v-model="visible"
    title="批量调整额度"
    width="800px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="调整项" prop="items">
        <div class="batch-items">
          <div
            v-for="(item, index) in form.items"
            :key="index"
            class="batch-item"
          >
            <el-input
              v-model="item.quotaId"
              placeholder="额度记录ID"
              style="width: 200px"
            />
            <el-input-number
              v-model="item.amount"
              :precision="2"
              :step="1"
              placeholder="调整金额"
              style="width: 150px"
            />
            <el-input
              v-model="item.reason"
              placeholder="调整原因（可选）"
              style="flex: 1"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="removeItem(index)"
            />
          </div>
          <el-button
            type="primary"
            :icon="Plus"
            @click="addItem"
            style="width: 100%"
          >
            添加一项
          </el-button>
        </div>
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
import { Plus, Delete } from '@element-plus/icons-vue'
import { batchAdjustQuota } from '@/api/quota'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  items: [
    {
      quotaId: '',
      amount: 0,
      reason: ''
    }
  ]
})

const rules = {
  items: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('至少添加一项'))
          return
        }
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          if (!item.quotaId) {
            callback(new Error(`第${i + 1}项缺少额度记录ID`))
            return
          }
          if (item.amount === null || item.amount === undefined) {
            callback(new Error(`第${i + 1}项缺少调整金额`))
            return
          }
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    form.items = [
      {
        quotaId: '',
        amount: 0,
        reason: ''
      }
    ]
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function addItem() {
  form.items.push({
    quotaId: '',
    amount: 0,
    reason: ''
  })
}

function removeItem(index) {
  if (form.items.length > 1) {
    form.items.splice(index, 1)
  } else {
    ElMessage.warning('至少保留一项')
  }
}

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
        const response = await batchAdjustQuota({
          items: form.items.map(item => ({
            quotaId: item.quotaId,
            amount: item.amount,
            reason: item.reason || undefined
          }))
        })
        if (response.success) {
          ElMessage.success('批量调整完成')
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
.batch-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-item {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
