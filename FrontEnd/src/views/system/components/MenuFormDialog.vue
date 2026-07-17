<template>
  <el-dialog
    v-model="dialogVisible"
    :title="formData.id ? '编辑菜单' : parentId && parentId !== '0' ? '新增子菜单' : '新增顶级菜单'"
    width="720px"
    destroy-on-close
    @closed="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <el-form-item label="菜单名称" prop="name" required>
        <el-input v-model="formData.name" placeholder="请输入菜单名称" />
      </el-form-item>

      <el-form-item label="国际化名称" prop="i18nNames" required>
        <I18nNamesEditor
          v-model="formData.i18nNames"
          @blur="formRef?.validateField('i18nNames')"
        />
      </el-form-item>

      <el-form-item label="路径" prop="path" required>
        <el-input v-model="formData.path" placeholder="如 /system/backend-menu" />
      </el-form-item>

      <el-form-item label="前端权限码" prop="frontendPermissionCode" required>
        <el-input
          v-model="formData.frontendPermissionCode"
          placeholder="大写下划线，如 BACKEND_MENU_VIEW"
        />
        <div class="form-tip">格式：大写字母、数字、下划线</div>
      </el-form-item>

      <el-form-item label="后端权限码" prop="backendPermissionCode" required>
        <el-input
          v-model="formData.backendPermissionCode"
          placeholder="大写下划线，如 BACKEND_MENU_MANAGE"
        />
      </el-form-item>

      <el-form-item label="父节点" prop="parentId" required>
        <el-select v-model="formData.parentId" placeholder="选择父节点" style="width: 100%">
          <el-option label="顶级菜单 (0)" value="0" />
          <el-option
            v-for="item in parentOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
            :disabled="item.id === formData.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="排序" prop="sortOrder" required>
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
import { defaultMenuForm, validateI18nNamesRequired } from '../composables/useMenuApi'

const PERMISSION_REGEX = /^[A-Z][A-Z0-9_]*$/

const props = defineProps({
  modelValue: Boolean,
  menu: Object,
  parentId: {
    type: String,
    default: '0',
  },
  parentOptions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const formRef = ref(null)
const submitting = ref(false)
const formData = reactive(defaultMenuForm())

const rules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  i18nNames: [
    {
      validator: (_rule, value, callback) => {
        if (validateI18nNamesRequired(value)) callback()
        else callback(new Error('请输入简体中文名称'))
      },
      trigger: 'blur',
    },
  ],
  path: [{ required: true, message: '请输入路径', trigger: 'blur' }],
  frontendPermissionCode: [
    { required: true, message: '请输入前端权限码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (PERMISSION_REGEX.test(value)) callback()
        else callback(new Error('前端权限码须为大写下划线格式'))
      },
      trigger: 'blur',
    },
  ],
  backendPermissionCode: [
    { required: true, message: '请输入后端权限码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (PERMISSION_REGEX.test(value)) callback()
        else callback(new Error('后端权限码须为大写下划线格式'))
      },
      trigger: 'blur',
    },
  ],
  parentId: [{ required: true, message: '请选择父节点', trigger: 'change' }],
  sortOrder: [{ required: true, message: '请输入排序', trigger: 'blur' }],
}

function resetForm() {
  Object.assign(formData, defaultMenuForm())
}

function fillForm(menu) {
  resetForm()
  if (!menu) {
    formData.parentId = props.parentId || '0'
    return
  }
  Object.assign(formData, {
    id: menu.id,
    name: menu.name,
    i18nNames: menu.i18nNames || [],
    path: menu.path || '',
    frontendPermissionCode: menu.frontendPermissionCode || '',
    backendPermissionCode: menu.backendPermissionCode || '',
    parentId: menu.parentId || '0',
    sortOrder: menu.sortOrder ?? 0,
  })
}

watch(
  () => [props.modelValue, props.menu, props.parentId],
  () => {
    if (props.modelValue) fillForm(props.menu)
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
    path: formData.path.trim(),
    frontendPermissionCode: formData.frontendPermissionCode.trim(),
    backendPermissionCode: formData.backendPermissionCode.trim(),
    parentId: formData.parentId || '0',
    sortOrder: formData.sortOrder,
  }
}

async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    emit('success', {
      id: formData.id,
      payload: buildPayload(),
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
