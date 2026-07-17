<template>
  <el-dialog
    v-model="dialogVisible"
    :title="formData.id ? '编辑功能按钮' : '新增功能按钮'"
    width="720px"
    destroy-on-close
    @closed="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <el-form-item label="按钮名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入按钮名称" />
      </el-form-item>

      <el-form-item label="国际化名称" prop="i18nNames" required>
        <I18nNamesEditor
          v-model="formData.i18nNames"
          @blur="formRef?.validateField('i18nNames')"
        />
      </el-form-item>

      <el-form-item label="是否可见" prop="isVisible">
        <el-switch v-model="formData.isVisible" />
      </el-form-item>

      <el-form-item label="是否禁用" prop="isDisabled">
        <el-switch v-model="formData.isDisabled" />
      </el-form-item>

      <el-form-item label="前端权限码" prop="frontendPermissionCode">
        <el-input
          v-model="formData.frontendPermissionCode"
          placeholder="大写下划线，如 BACKEND_MENU_CREATE"
        />
      </el-form-item>

      <el-form-item label="后端权限码" prop="backendPermissionCode">
        <el-input
          v-model="formData.backendPermissionCode"
          placeholder="大写下划线，如 BACKEND_MENU_CREATE"
        />
      </el-form-item>

      <el-form-item label="排序" prop="sortOrder">
        <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import I18nNamesEditor from './I18nNamesEditor.vue'
import { defaultButtonForm, validateI18nNamesRequired } from '../composables/useMenuApi'

const PERMISSION_REGEX = /^[A-Z][A-Z0-9_]*$/

const props = defineProps({
  modelValue: Boolean,
  button: Object,
  menuId: String,
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const formRef = ref(null)
const submitting = ref(false)
const formData = reactive(defaultButtonForm())

const rules = {
  name: [{ required: true, message: '请输入按钮名称', trigger: 'blur' }],
  i18nNames: [
    {
      validator: (_rule, value, callback) => {
        if (validateI18nNamesRequired(value)) callback()
        else callback(new Error('请输入简体中文名称'))
      },
      trigger: 'blur',
    },
  ],
  frontendPermissionCode: [
    {
      validator: (_rule, value, callback) => {
        if (!value || PERMISSION_REGEX.test(value)) callback()
        else callback(new Error('前端权限码须为大写下划线格式'))
      },
      trigger: 'blur',
    },
  ],
  backendPermissionCode: [
    {
      validator: (_rule, value, callback) => {
        if (!value || PERMISSION_REGEX.test(value)) callback()
        else callback(new Error('后端权限码须为大写下划线格式'))
      },
      trigger: 'blur',
    },
  ],
}

function resetForm() {
  Object.assign(formData, defaultButtonForm())
}

function fillForm(button) {
  resetForm()
  formData.menuId = props.menuId
  if (!button) return
  Object.assign(formData, {
    id: button.id,
    menuId: button.menuId || props.menuId,
    name: button.name,
    i18nNames: button.i18nNames || [],
    isVisible: button.isVisible !== false,
    isDisabled: button.isDisabled === true,
    frontendPermissionCode: button.frontendPermissionCode || '',
    backendPermissionCode: button.backendPermissionCode || '',
    sortOrder: button.sortOrder ?? 0,
  })
}

watch(
  () => [props.modelValue, props.button, props.menuId],
  () => {
    if (props.modelValue) fillForm(props.button)
  },
  { immediate: true }
)

function handleClose() {
  resetForm()
  formRef.value?.clearValidate()
}

function buildPayload() {
  return {
    name: formData.name.trim(),
    i18nNames: formData.i18nNames,
    isVisible: formData.isVisible,
    isDisabled: formData.isDisabled,
    frontendPermissionCode: formData.frontendPermissionCode?.trim() || null,
    backendPermissionCode: formData.backendPermissionCode?.trim() || null,
    sortOrder: formData.sortOrder,
  }
}

async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    emit('success', {
      id: formData.id,
      menuId: formData.menuId || props.menuId,
      payload: buildPayload(),
    })
  } finally {
    submitting.value = false
  }
}
</script>
