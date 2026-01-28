<template>
  <el-dialog
    v-model="visible"
    :title="formData.id ? '编辑管理员' : '新增管理员'"
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
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="例如：admin001"
          :disabled="!!formData.id"
        />
        <div class="form-tip">3-20个字符，只能包含字母、数字和下划线，创建后不可修改</div>
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="formData.email"
          placeholder="例如：admin001@example.com"
        />
      </el-form-item>

      <el-form-item label="密码" :prop="formData.id ? 'passwordOptional' : 'password'">
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="formData.id ? '留空则不修改密码' : '请输入密码'"
          show-password
        />
        <div v-if="formData.id" class="form-tip">留空则不修改密码</div>
        <div v-else class="form-tip">6-50个字符</div>
      </el-form-item>

      <el-form-item label="角色" prop="role">
        <el-select
          v-model="formData.role"
          placeholder="请选择角色"
          style="width: 100%"
        >
          <el-option label="平台管理员" value="platform_admin" />
          <el-option label="运营人员" value="operator" />
          <el-option label="风控人员" value="risk_control" />
          <el-option label="财务人员" value="finance" />
          <el-option label="只读角色" value="read_only" />
        </el-select>
        <div class="form-tip">不能创建超级管理员角色</div>
      </el-form-item>

      <el-form-item label="状态">
        <el-radio-group v-model="formData.status" :disabled="isSuperAdmin">
          <el-radio label="active">已启用</el-radio>
          <el-radio label="inactive">已禁用</el-radio>
        </el-radio-group>
        <div v-if="isSuperAdmin" class="form-tip warning-tip">
          超级管理员不能被禁用
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
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  admin: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  id: null,
  username: '',
  email: '',
  password: '',
  role: '',
  status: 'active'
})

// 判断是否为超级管理员
const isSuperAdmin = computed(() => {
  return formData.role === 'super_admin' || props.admin?.role === 'super_admin'
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在 6 到 50 个字符', trigger: 'blur' }
  ],
  passwordOptional: [
    { min: 6, max: 50, message: '密码长度在 6 到 50 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.admin) {
    Object.assign(formData, {
      id: props.admin.id,
      username: props.admin.username || '',
      email: props.admin.email || '',
      password: '', // 编辑时不显示密码
      role: props.admin.role || '',
      // 如果是超级管理员，强制设置为 active
      status: props.admin.role === 'super_admin' ? 'active' : (props.admin.status || 'active')
    })
  } else if (val) {
    // 重置表单
    Object.assign(formData, {
      id: null,
      username: '',
      email: '',
      password: '',
      role: '',
      status: 'active'
    })
  }
})

// 监听角色变化，如果是超级管理员，强制状态为 active
watch(() => formData.role, (newRole) => {
  if (newRole === 'super_admin') {
    formData.status = 'active'
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

function handleSubmit() {
  formRef.value?.validate((valid) => {
    if (valid) {
      // 如果是超级管理员，不允许修改为禁用状态
      if (isSuperAdmin.value && formData.status === 'inactive') {
        ElMessage.warning('超级管理员不能被禁用')
        return
      }

      submitting.value = true
      const submitData = { ...formData }

      // 如果是超级管理员，强制设置为 active
      if (isSuperAdmin.value) {
        submitData.status = 'active'
      }

      // 如果是编辑且密码为空，则不提交密码字段
      if (submitData.id && !submitData.password) {
        delete submitData.password
      }

      emit('success', submitData)
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.warning-tip {
  color: #f59e0b;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

