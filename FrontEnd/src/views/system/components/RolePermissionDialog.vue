<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="960px"
    top="10vh"
    destroy-on-close
    class="role-permission-dialog"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <div class="dialog-body-content">
      <el-alert
        v-if="isFullAccess"
        type="info"
        :closable="false"
        show-icon
        title="超级管理员拥有全部权限，不可修改。"
        class="full-access-alert"
      />

      <div v-loading="loading" class="permission-layout">
      <div class="menu-tree-panel">
        <div class="panel-header">
          <h3 class="panel-title">菜单权限</h3>
        </div>
        <div class="panel-body">
          <template v-if="menuTree.length">
            <RolePermissionTreeNode
              v-for="node in menuTree"
              :key="node.id"
              :node="node"
              :selected-id="selectedMenu?.id"
              :expanded-ids="expandedIds"
              :checked-menu-ids="checkedMenuIds"
              :readonly="isFullAccess"
              @select="handleSelectMenu"
              @toggle-expand="toggleExpand"
              @toggle-menu="handleToggleMenu"
            />
          </template>
          <el-empty v-else description="暂无菜单数据" :image-size="80" />
        </div>
      </div>

      <div class="button-panel">
        <template v-if="selectedMenu">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">{{ selectedMenu.name }}</h3>
              <p class="panel-subtitle">页面操作 / 按钮权限</p>
            </div>
          </div>
          <div class="panel-body">
            <template v-if="selectedMenu.buttons?.length">
              <div
                v-for="button in selectedMenu.buttons"
                :key="button.id"
                :class="['button-row', { 'button-row--disabled': !isSelectedMenuChecked }]"
              >
                <el-checkbox
                  :model-value="checkedButtonIds.has(button.id)"
                  :disabled="isFullAccess || !isSelectedMenuChecked"
                  @change="checked => handleToggleButton(button, checked)"
                >
                  <span class="button-name">{{ button.name }}</span>
                </el-checkbox>
                <span class="button-code">
                  {{ button.frontendPermissionCode || '无前端权限码' }}
                </span>
              </div>
            </template>
            <el-empty v-else description="该菜单暂无按钮权限" :image-size="72" />
          </div>
        </template>
        <div v-else class="placeholder">
          <el-icon :size="56"><Menu /></el-icon>
          <p>请在左侧选择一个菜单</p>
        </div>
      </div>
    </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-if="!isFullAccess"
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        保存权限
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Menu } from '@element-plus/icons-vue'
import RolePermissionTreeNode from './RolePermissionTreeNode.vue'
import { getBackendRolePermissions, saveBackendRolePermissions } from '@/api/backendRole'
import { getClientRolePermissions, saveClientRolePermissions } from '@/api/clientRole'
import { flattenMenuTree } from '../composables/useMenuApi'
import {
  collectAncestorIds,
  collectButtonIdsForMenus,
  collectDescendantIds,
  hasCheckedInSubtree,
  sanitizeButtonIds,
} from '../composables/useRolePermissionTree'

const props = defineProps({
  modelValue: Boolean,
  role: Object,
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

const loading = ref(false)
const submitting = ref(false)
const menuTree = ref([])
const flatMenus = ref([])
const checkedMenuIds = ref(new Set())
const checkedButtonIds = ref(new Set())
const selectedMenu = ref(null)
const expandedIds = ref(new Set())
const isFullAccess = ref(false)

const dialogTitle = computed(() => {
  const name = props.role?.name || '角色'
  const prefix = props.roleScope === 'client' ? '客户端绑定权限' : '绑定权限'
  return `${prefix} - ${name}`
})

const permissionApi = computed(() =>
  props.roleScope === 'client'
    ? { get: getClientRolePermissions, save: saveClientRolePermissions }
    : { get: getBackendRolePermissions, save: saveBackendRolePermissions }
)

const isSelectedMenuChecked = computed(() => {
  if (!selectedMenu.value) return false
  return checkedMenuIds.value.has(selectedMenu.value.id)
})

function findMenuNodeById(menuId) {
  return flatMenus.value.find(menu => menu.id === menuId)
}

function applyMenuToggle(menu, checked) {
  const nextMenuIds = new Set(checkedMenuIds.value)
  const nextButtonIds = new Set(checkedButtonIds.value)
  const descendantIds = collectDescendantIds(menu)

  if (checked) {
    descendantIds.forEach(id => nextMenuIds.add(id))
    collectAncestorIds(menu.id, flatMenus.value).forEach(id => nextMenuIds.add(id))
  } else {
    descendantIds.forEach(id => nextMenuIds.delete(id))
    collectButtonIdsForMenus(descendantIds, flatMenus.value).forEach(id => nextButtonIds.delete(id))

    collectAncestorIds(menu.id, flatMenus.value).forEach(ancestorId => {
      const ancestorNode = findMenuNodeById(ancestorId)
      if (ancestorNode && !hasCheckedInSubtree(ancestorNode, nextMenuIds)) {
        nextMenuIds.delete(ancestorId)
        collectButtonIdsForMenus([ancestorId], flatMenus.value).forEach(id => nextButtonIds.delete(id))
      }
    })
  }

  checkedMenuIds.value = nextMenuIds
  checkedButtonIds.value = sanitizeButtonIds(nextMenuIds, nextButtonIds, flatMenus.value)
}

function toggleExpand(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function handleSelectMenu(menu) {
  selectedMenu.value = menu
}

function handleToggleMenu(menu, checked) {
  applyMenuToggle(menu, checked)
}

function handleToggleButton(button, checked) {
  if (!selectedMenu.value || !checkedMenuIds.value.has(selectedMenu.value.id)) return

  const nextButtonIds = new Set(checkedButtonIds.value)
  if (checked) nextButtonIds.add(button.id)
  else nextButtonIds.delete(button.id)
  checkedButtonIds.value = nextButtonIds
}

async function handleOpen() {
  if (!props.role?.id) return

  loading.value = true
  try {
    const res = await permissionApi.value.get(props.role.id)
    const data = res.data || res

    menuTree.value = data.menuTree || []
    flatMenus.value = flattenMenuTree(menuTree.value)
    checkedMenuIds.value = new Set(data.grantedMenuIds || [])
    checkedButtonIds.value = sanitizeButtonIds(
      checkedMenuIds.value,
      new Set(data.grantedButtonIds || []),
      flatMenus.value
    )
    isFullAccess.value = Boolean(data.isFullAccess)
    expandedIds.value = new Set(flatMenus.value.map(menu => menu.id))
    selectedMenu.value = menuTree.value[0] || null
  } finally {
    loading.value = false
  }
}

function handleClosed() {
  menuTree.value = []
  flatMenus.value = []
  checkedMenuIds.value = new Set()
  checkedButtonIds.value = new Set()
  selectedMenu.value = null
  expandedIds.value = new Set()
  isFullAccess.value = false
}

async function handleSubmit() {
  if (!props.role?.id || isFullAccess.value) return

  submitting.value = true
  try {
    await permissionApi.value.save(props.role.id, {
      menuIds: [...checkedMenuIds.value],
      buttonIds: [...sanitizeButtonIds(checkedMenuIds.value, checkedButtonIds.value, flatMenus.value)],
    })
    ElMessage.success('角色权限已保存')
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dialog-body-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.full-access-alert {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.permission-layout {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.menu-tree-panel,
.button-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-tree-panel {
  width: 360px;
  flex-shrink: 0;
  min-height: 0;
}

.button-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.panel-header {
  flex-shrink: 0;
  padding: 18px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.8);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.panel-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.button-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  margin-bottom: 10px;
}

.button-row--disabled {
  background: #f8fafc;
  border-color: #e2e8f0;
  opacity: 0.65;
}

.button-row--disabled .button-name,
.button-row--disabled .button-code {
  color: #94a3b8;
}

.button-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.button-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  flex-shrink: 0;
}

.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 8px;
}
</style>

<style>
.el-dialog.role-permission-dialog {
  height: 80vh;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  margin-bottom: 10vh;
  overflow: hidden;
}

.el-dialog.role-permission-dialog .el-dialog__header {
  flex-shrink: 0;
}

.el-dialog.role-permission-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
}

.el-dialog.role-permission-dialog .el-dialog__footer {
  flex-shrink: 0;
}
</style>
