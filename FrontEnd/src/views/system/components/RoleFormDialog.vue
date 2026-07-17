<template>
  <el-dialog
    v-model="visible"
    :title="isCreate ? '新增角色' : '编辑角色'"
    width="520px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-form-item v-if="isCreate" label="角色标识" prop="roleKey">
        <el-input
          v-model="form.roleKey"
          placeholder="如 custom_auditor"
          maxlength="50"
          show-word-limit
        />
        <p class="field-tip">小写字母开头，仅支持小写字母、数字和下划线</p>
      </el-form-item>
      <el-form-item v-else label="角色标识">
        <el-input :model-value="role?.roleKey" disabled />
      </el-form-item>
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="请输入角色描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isCreate ? '创建' : '保存' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createBackendRole, updateBackendRole } from '@/api/backendRole'
import { createClientRole, updateClientRole } from '@/api/clientRole'

const props = defineProps({
  modelValue: Boolean,
  role: Object,
  mode: {
    type: String,
    default: 'edit',
    validator: value => ['create', 'edit'].includes(value),
  },
  roleScope: {
    type: String,
    default: 'backend',
    validator: value => ['backend', 'client'].includes(value),
  },
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const isCreate = computed(() => props.mode === 'create')

const roleApi = computed(() =>
  props.roleScope === 'client'
    ? { create: createClientRole, update: updateClientRole }
    : { create: createBackendRole, update: updateBackendRole }
)

const formRef = ref()
const submitting = ref(false)

const form = reactive({
  roleKey: '',
  name: '',
  description: '',
})

const rules = computed(() => ({
  roleKey: isCreate.value
    ? [
        { required: true, message: '请输入角色标识', trigger: 'blur' },
        {
          pattern: /^[a-z][a-z0-9_]*$/,
          message: '角色标识格式不正确',
          trigger: 'blur',
        },
      ]
    : [],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}))

watch(
  () => [props.role, props.mode, props.modelValue],
  () => {
    if (!props.modelValue) return
    if (isCreate.value) {
      form.roleKey = ''
      form.name = ''
      form.description = ''
      return
    }
    form.roleKey = props.role?.roleKey || ''
    form.name = props.role?.name || ''
    form.description = props.role?.description || ''
  },
  { immediate: true }
)

function handleClosed() {
  formRef.value?.resetFields()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isCreate.value) {
      await roleApi.value.create({
        roleKey: form.roleKey.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      ElMessage.success('角色已创建')
    } else {
      if (!props.role?.id) return
      await roleApi.value.update(props.role.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      ElMessage.success('角色信息已更新')
    }
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.field-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
}
</style>
