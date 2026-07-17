<template>
  <div class="client-role-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">客户端角色权限管理</h1>
        <p class="page-description">管理客户端应用角色与客户端菜单、按钮权限绑定。</p>
      </div>
      <div class="header-right">
        <el-button v-if="isSuperAdmin" type="primary" :icon="Plus" @click="openCreateDialog">
          新增角色
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="role-grid">
      <div v-for="role in roles" :key="role.id" class="role-card">
        <div class="role-card-header">
          <div class="role-icon">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="role-info">
            <div class="role-title-row">
              <h3 class="role-name">{{ role.name }}</h3>
            </div>
            <p class="role-key">{{ role.roleKey }}</p>
          </div>
        </div>

        <p class="role-description">{{ role.description || '暂无描述' }}</p>

        <div class="role-meta">
          <span>已绑定 {{ role.permissionCount }} 项权限</span>
        </div>

        <div class="role-actions">
          <el-button :icon="Edit" @click="openEditDialog(role)">编辑</el-button>
          <el-button type="primary" :icon="Key" @click="openPermissionDialog(role)">
            绑定权限
          </el-button>
          <el-button
            v-if="isSuperAdmin"
            type="danger"
            plain
            :icon="Delete"
            @click="handleDeleteRole(role)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <RoleFormDialog
      v-model="formDialogVisible"
      :role="editingRole"
      :mode="formDialogMode"
      role-scope="client"
      @success="fetchRoles"
    />

    <RolePermissionDialog
      v-model="permissionDialogVisible"
      :role="permissionRole"
      role-scope="client"
      @success="fetchRoles"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Key, Plus, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { deleteClientRole, getClientRoles } from '@/api/clientRole'
import RoleFormDialog from './components/RoleFormDialog.vue'
import RolePermissionDialog from './components/RolePermissionDialog.vue'

const authStore = useAuthStore()
const loading = ref(false)
const roles = ref([])
const formDialogVisible = ref(false)
const formDialogMode = ref('edit')
const permissionDialogVisible = ref(false)
const editingRole = ref(null)
const permissionRole = ref(null)

const isSuperAdmin = computed(() => authStore.admin?.role === 'super_admin')

async function fetchRoles() {
  loading.value = true
  try {
    const res = await getClientRoles()
    roles.value = res.data || res || []
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingRole.value = null
  formDialogMode.value = 'create'
  formDialogVisible.value = true
}

function openEditDialog(role) {
  editingRole.value = role
  formDialogMode.value = 'edit'
  formDialogVisible.value = true
}

function openPermissionDialog(role) {
  permissionRole.value = role
  permissionDialogVisible.value = true
}

async function handleDeleteRole(role) {
  try {
    await ElMessageBox.confirm(
      `确定删除角色「${role.name}」吗？删除后该角色的权限配置将一并清除。`,
      '删除角色',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    )
    await deleteClientRole(role.id)
    ElMessage.success('角色已删除')
    await fetchRoles()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      // 接口错误已由 request 拦截器提示
    }
  }
}

onMounted(fetchRoles)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-right {
  flex-shrink: 0;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.role-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.15s ease;
}

.role-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.role-card-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.role-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.role-info {
  flex: 1;
  min-width: 0;
}

.role-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.role-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.role-key {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.role-description {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;
  min-height: 44px;
}

.role-meta {
  font-size: 13px;
  color: #475569;
  padding-top: 4px;
  border-top: 1px solid #f1f5f9;
}

.role-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.role-actions .el-button {
  flex: 1;
  min-width: 88px;
}
</style>
