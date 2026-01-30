<template>
  <el-dialog
    v-model="visible"
    title="批量删除额度流水"
    width="500px"
    @close="handleClose"
  >
    <el-alert
      title="警告"
      type="warning"
      :closable="false"
      style="margin-bottom: 20px"
    >
      <template #default>
        确定要删除选中的 {{ selectedIds.length }} 条额度流水记录吗？此操作不可恢复！
      </template>
    </el-alert>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="danger" @click="handleSubmit" :loading="loading">确定删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { batchDeleteQuotaRecords } from '@/api/quotaRecord'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
}

async function handleSubmit() {
  if (props.selectedIds.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }

  ElMessageBox.confirm(
    `确定要删除 ${props.selectedIds.length} 条额度流水记录吗？此操作不可恢复！`,
    '确认删除',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    loading.value = true
    try {
      const response = await batchDeleteQuotaRecords({ ids: props.selectedIds })
      if (response.success) {
        ElMessage.success(`成功删除 ${response.data?.count || props.selectedIds.length} 条记录`)
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
</script>
