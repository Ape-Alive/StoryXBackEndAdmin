<template>
  <el-dialog
    v-model="visible"
    title="分配套餐给用户"
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
      <el-form-item label="用户" prop="userId">
        <el-select
          v-model="formData.userId"
          placeholder="请选择用户"
          filterable
          remote
          :remote-method="searchUsers"
          :loading="userLoading"
          style="width: 100%"
          @change="handleUserChange"
          @focus="() => { if (userOptions.value.length === 0) searchUsers('') }"
        >
          <el-option
            v-for="user in userOptions"
            :key="user.id"
            :label="`${user.email}${user.phone ? ' (' + user.phone + ')' : ''}`"
            :value="user.id"
          >
            <div style="display: flex; justify-content: space-between;">
              <span>{{ user.email }}</span>
              <span style="color: #8492a6; font-size: 12px;" v-if="user.phone">{{ user.phone }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="套餐" prop="packageId">
        <el-select
          v-model="formData.packageId"
          placeholder="请选择套餐"
          filterable
          remote
          :remote-method="searchPackages"
          :loading="packageLoading"
          style="width: 100%"
          @focus="() => { if (packageOptions.value.length === 0) searchPackages('') }"
        >
          <el-option
            v-for="pkg in packageOptions"
            :key="pkg.id"
            :label="`${pkg.displayName || pkg.name}${pkg.price ? ' (¥' + pkg.price + ')' : ''}`"
            :value="pkg.id"
          >
            <div style="display: flex; justify-content: space-between;">
              <span>{{ pkg.displayName || pkg.name }}</span>
              <span style="color: #8492a6; font-size: 12px;" v-if="pkg.price">¥{{ pkg.price }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-input-number
          v-model="formData.priority"
          :min="0"
          :max="100"
          placeholder="优先级（数字越大优先级越高）"
          style="width: 100%"
        />
        <div class="form-tip">数字越大优先级越高，默认为0</div>
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
import { getUsers } from '@/api/user'
import { getPackages } from '@/api/package'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const visible = ref(props.modelValue)
const submitting = ref(false)
const userLoading = ref(false)
const packageLoading = ref(false)
const userOptions = ref([])
const packageOptions = ref([])

const formData = reactive({
  userId: '',
  packageId: '',
  priority: 0
})

const rules = {
  userId: [
    { required: true, message: '请选择用户', trigger: 'change' }
  ],
  packageId: [
    { required: true, message: '请选择套餐', trigger: 'change' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    resetForm()
    loadInitialData()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function resetForm() {
  formData.userId = ''
  formData.packageId = ''
  formData.priority = 0
  userOptions.value = []
  packageOptions.value = []
  formRef.value?.clearValidate()
}

async function loadInitialData() {
  // 加载前10个用户和套餐
  try {
    const [usersRes, packagesRes] = await Promise.all([
      getUsers({ page: 1, pageSize: 10 }),
      getPackages({ page: 1, pageSize: 10, isActive: true })
    ])
    if (usersRes.success) {
      userOptions.value = usersRes.data || []
    }
    if (packagesRes.success) {
      packageOptions.value = packagesRes.data || []
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  }
}

async function searchUsers(query) {
  userLoading.value = true
  try {
    const params = query ? { page: 1, pageSize: 20, email: query } : { page: 1, pageSize: 20 }
    const response = await getUsers(params)
    if (response.success) {
      userOptions.value = response.data || []
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  } finally {
    userLoading.value = false
  }
}

async function searchPackages(query) {
  packageLoading.value = true
  try {
    const params = query ? { page: 1, pageSize: 20, name: query, isActive: true } : { page: 1, pageSize: 20, isActive: true }
    const response = await getPackages(params)
    if (response.success) {
      packageOptions.value = response.data || []
    }
  } catch (error) {
    // 错误已在 request.js 中处理
  } finally {
    packageLoading.value = false
  }
}

function handleUserChange() {
  // 用户选择变化时的处理
}

function handleClose() {
  visible.value = false
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true
      emit('success', { ...formData })
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
