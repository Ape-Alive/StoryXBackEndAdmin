<template>
  <div class="catalog-role-binding-block">
    <div class="catalog-role-binding-title">客户端角色绑定</div>
    <el-form-item label="绑定方式" :prop="prop" :rules="itemRules" required>
      <el-radio-group :model-value="bindMode" @change="handleModeChange">
        <el-radio-button label="all">全部角色</el-radio-button>
        <el-radio-button label="specific">指定角色</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="!clientRoleBindAll" label="选择角色" prop="clientRoleIds" :rules="roleIdsRules">
      <el-select
        :model-value="clientRoleIds"
        multiple
        filterable
        clearable
        collapse-tags
        collapse-tags-tooltip
        :loading="loading"
        placeholder="可多选客户端角色"
        style="width: 100%"
        @update:model-value="handleRoleIdsChange"
      >
        <el-option
          v-for="role in roleOptions"
          :key="role.id"
          :label="`${role.name || role.roleKey}（${role.roleKey}）`"
          :value="role.id"
        />
      </el-select>
    </el-form-item>
    <div class="form-tip">
      「全部角色」与「指定角色」互斥：选全部会清空指定角色；选任意角色会关闭全部。
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getClientRoles } from '@/api/clientRole'

const props = defineProps({
  clientRoleBindAll: {
    type: Boolean,
    default: true
  },
  clientRoleIds: {
    type: Array,
    default: () => []
  },
  prop: {
    type: String,
    default: 'clientRoleBindAll'
  },
  required: {
    type: Boolean,
    default: true
  },
  preferRoleKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:clientRoleBindAll', 'update:clientRoleIds'])

const roleOptions = ref([])
const loading = ref(false)
const preferApplied = ref(false)

const bindMode = computed(() => (props.clientRoleBindAll ? 'all' : 'specific'))

const itemRules = computed(() => {
  if (!props.required) return undefined
  return [
    {
      validator: (_rule, _value, callback) => {
        if (props.clientRoleBindAll || (props.clientRoleIds && props.clientRoleIds.length > 0)) {
          callback()
          return
        }
        callback(new Error('请选择全部角色，或至少指定一个客户端角色'))
      },
      trigger: 'change'
    }
  ]
})

const roleIdsRules = computed(() => {
  if (!props.required || props.clientRoleBindAll) return undefined
  return [
    {
      validator: (_rule, _value, callback) => {
        if (props.clientRoleIds?.length > 0) {
          callback()
          return
        }
        callback(new Error('请至少选择一个客户端角色'))
      },
      trigger: 'change'
    }
  ]
})

function handleModeChange(mode) {
  if (mode === 'all') {
    emit('update:clientRoleBindAll', true)
    emit('update:clientRoleIds', [])
    return
  }
  emit('update:clientRoleBindAll', false)
}

function handleRoleIdsChange(val) {
  const ids = Array.isArray(val) ? [...new Set(val)] : []
  if (ids.length > 0) {
    emit('update:clientRoleBindAll', false)
  }
  emit('update:clientRoleIds', ids)
}

function tryApplyPreferRoleKey() {
  if (preferApplied.value || !props.preferRoleKey || props.clientRoleBindAll) return
  if (props.clientRoleIds?.length > 0) return
  const role = roleOptions.value.find(r => r.roleKey === props.preferRoleKey)
  if (!role) return
  preferApplied.value = true
  emit('update:clientRoleBindAll', false)
  emit('update:clientRoleIds', [role.id])
}

async function loadRoleOptions() {
  loading.value = true
  try {
    const res = await getClientRoles()
    if (res?.success) {
      roleOptions.value = Array.isArray(res.data) ? res.data : []
    } else if (Array.isArray(res?.data)) {
      roleOptions.value = res.data
    } else {
      roleOptions.value = []
      ElMessage.error(res?.message || '加载客户端角色失败')
    }
    tryApplyPreferRoleKey()
  } catch (e) {
    roleOptions.value = []
    ElMessage.error(e?.message || '加载客户端角色失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.preferRoleKey, props.clientRoleBindAll],
  () => {
    preferApplied.value = false
    tryApplyPreferRoleKey()
  }
)

onMounted(() => {
  loadRoleOptions()
})
</script>

<style scoped>
.catalog-role-binding-block {
  width: 100%;
  margin: 8px 0 16px;
  padding: 12px 14px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.catalog-role-binding-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.form-tip {
  margin: -4px 0 4px 120px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}
</style>
