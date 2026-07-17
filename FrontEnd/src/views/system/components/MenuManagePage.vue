<template>
  <div class="menu-manage-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-description">{{ description }}</p>
      </div>
    </div>

    <div class="menu-manage-layout">
      <MenuTreePanel
        v-model:keyword="keyword"
        :tree-data="treeData"
        :selected-id="selectedMenu?.id"
        :expanded-ids="expandedIds"
        :loading="treeLoading"
        @search="fetchTree"
        @select="handleSelectMenu"
        @toggle-expand="toggleExpand"
        @add-root="openMenuDialog(null, '0')"
        @add-child="node => openMenuDialog(null, node.id)"
        @edit="node => openMenuDialog(node, node.parentId)"
        @delete="handleDeleteMenu"
      />

      <MenuButtonPanel
        :selected-menu="selectedMenu"
        :buttons="selectedButtons"
        :loading="buttonLoading"
        @add-button="openButtonDialog(null)"
        @edit-button="openButtonDialog"
        @delete-button="handleDeleteButton"
      />
    </div>

    <MenuFormDialog
      v-model="menuDialogVisible"
      :menu="editingMenu"
      :parent-id="menuParentId"
      :parent-options="flatMenus"
      @success="handleMenuSubmit"
    />

    <MenuButtonFormDialog
      v-model="buttonDialogVisible"
      :button="editingButton"
      :menu-id="selectedMenu?.id"
      @success="handleButtonSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MenuTreePanel from './MenuTreePanel.vue'
import MenuButtonPanel from './MenuButtonPanel.vue'
import MenuFormDialog from './MenuFormDialog.vue'
import MenuButtonFormDialog from './MenuButtonFormDialog.vue'
import { useMenuApi, flattenMenuTree } from '../composables/useMenuApi'

const props = defineProps({
  menuType: {
    type: String,
    required: true,
    validator: value => ['backend', 'client'].includes(value),
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
})

const api = useMenuApi(props.menuType)

const treeData = ref([])
const flatMenus = ref([])
const keyword = ref('')
const treeLoading = ref(false)
const buttonLoading = ref(false)
const selectedMenu = ref(null)
const selectedButtons = ref([])
const expandedIds = ref(new Set())

const menuDialogVisible = ref(false)
const buttonDialogVisible = ref(false)
const editingMenu = ref(null)
const editingButton = ref(null)
const menuParentId = ref('0')

function collectExpandableIds(nodes, set = new Set()) {
  nodes.forEach(node => {
    if (node.children?.length) {
      set.add(node.id)
      collectExpandableIds(node.children, set)
    }
  })
  return set
}

function findMenuInTree(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findMenuInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}

async function fetchTree(preserveSelection = true) {
  treeLoading.value = true
  try {
    const params = {}
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const res = await api.getTree(params)
    if (res.success) {
      treeData.value = res.data || []
      flatMenus.value = flattenMenuTree(treeData.value)
      if (!expandedIds.value.size) {
        expandedIds.value = collectExpandableIds(treeData.value)
      }
      if (preserveSelection && selectedMenu.value?.id) {
        const found = findMenuInTree(treeData.value, selectedMenu.value.id)
        if (found) {
          selectedMenu.value = found
          await fetchButtons(found.id)
        } else {
          selectedMenu.value = null
          selectedButtons.value = []
        }
      }
    }
  } finally {
    treeLoading.value = false
  }
}

async function fetchButtons(menuId) {
  if (!menuId) {
    selectedButtons.value = []
    return
  }
  buttonLoading.value = true
  try {
    const res = await api.listButtons(menuId)
    if (res.success) {
      selectedButtons.value = res.data || []
    }
  } finally {
    buttonLoading.value = false
  }
}

function handleSelectMenu(menu) {
  selectedMenu.value = menu
  fetchButtons(menu.id)
}

function toggleExpand(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function openMenuDialog(menu, parentId = '0') {
  editingMenu.value = menu
  menuParentId.value = parentId
  menuDialogVisible.value = true
}

function openButtonDialog(button) {
  if (!selectedMenu.value) {
    ElMessage.warning('请先选择一个菜单')
    return
  }
  editingButton.value = button
  buttonDialogVisible.value = true
}

async function handleMenuSubmit({ id, payload }) {
  const res = id
    ? await api.updateMenu(id, payload)
    : await api.createMenu(payload)

  if (res.success) {
    ElMessage.success(id ? '菜单更新成功' : '菜单创建成功')
    menuDialogVisible.value = false
    await fetchTree(true)
    if (selectedMenu.value?.id === id || !id) {
      const targetId = id || res.data?.id
      if (targetId) {
        const found = findMenuInTree(treeData.value, targetId)
        if (found) handleSelectMenu(found)
      }
    }
  }
}

async function handleDeleteMenu(menu) {
  await ElMessageBox.confirm(`确定删除菜单「${menu.name}」及其所有子菜单吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })

  const res = await api.deleteMenu(menu.id)
  if (res.success) {
    ElMessage.success('菜单删除成功')
    if (selectedMenu.value?.id === menu.id) {
      selectedMenu.value = null
      selectedButtons.value = []
    }
    await fetchTree(false)
  }
}

async function handleButtonSubmit({ id, menuId, payload }) {
  const res = id
    ? await api.updateButton(menuId, id, payload)
    : await api.createButton(menuId, payload)

  if (res.success) {
    ElMessage.success(id ? '按钮更新成功' : '按钮创建成功')
    buttonDialogVisible.value = false
    await fetchButtons(menuId)
    await fetchTree(true)
  }
}

async function handleDeleteButton(button) {
  await ElMessageBox.confirm(`确定删除按钮「${button.name}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })

  const res = await api.deleteButton(selectedMenu.value.id, button.id)
  if (res.success) {
    ElMessage.success('按钮删除成功')
    await fetchButtons(selectedMenu.value.id)
    await fetchTree(true)
  }
}

onMounted(async () => {
  await fetchTree(false)
})
</script>

<style scoped>
.menu-manage-page {
  min-height: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}

.page-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.menu-manage-layout {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .menu-manage-layout {
    flex-direction: column;
  }
}
</style>
