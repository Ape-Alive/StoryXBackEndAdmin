<template>
  <div class="terminal-user-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">终端用户管理</h1>
        <p class="page-description">
          查看和管理终端用户账号、登录状态及设备数量等信息。
        </p>
      </div>
    </div>

    <!-- 搜索和统计 -->
    <div class="filter-section">
      <div class="terminal-user-filter">
        <el-input
          v-model="filters.email"
          placeholder="按邮箱搜索..."
          clearable
          class="filter-input"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Message /></el-icon>
          </template>
        </el-input>
        <el-input
          v-model="filters.phone"
          placeholder="按手机号搜索..."
          clearable
          class="filter-input"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Phone /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.status"
          placeholder="选择状态"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="全部状态" :value="''" />
          <el-option label="正常" value="normal" />
          <el-option label="冻结" value="frozen" />
          <el-option label="封禁" value="banned" />
        </el-select>
      </div>

      <div class="statistics">
        <span class="stat-item">全部: {{ statistics.total }}</span>
        <span class="stat-item">正常: {{ statistics.normal }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <div class="terminal-user-table">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="selected-info" v-if="selectedUserIds.length">
            已选择 {{ selectedUserIds.length }} 项
          </span>
        </div>
        <div class="toolbar-right">
          <el-dropdown
            v-if="selectedUserIds.length"
            trigger="click"
          >
            <el-button type="primary" text>
              批量操作
              <el-icon class="el-icon--right">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="openBatchStatusDialog('normal')">
                  批量设为正常
                </el-dropdown-item>
                <el-dropdown-item @click="openBatchStatusDialog('frozen')">
                  批量冻结
                </el-dropdown-item>
                <el-dropdown-item @click="openBatchStatusDialog('banned')">
                  批量封禁
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleBatchDelete">
                  <span style="color: #ef4444">批量删除</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#f8fafc', color: '#64748b', fontWeight: 600 }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" fixed="left" />
        <el-table-column label="用户信息" min-width="220" fixed="left">
          <template #default="{ row }">
            <div class="user-info">
              <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(row.email) }">
                {{ getAvatarText(row.email) }}
              </div>
              <div class="user-details">
                <div class="user-email">{{ row.email }}</div>
                <div class="user-phone">{{ row.phone || '未填写手机号' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <div :class="['status-badge', getStatusClass(row.status)]">
              <el-icon class="status-icon">
                <component :is="row.status === 'normal' ? 'CircleCheck' : (row.status === 'frozen' ? 'Timer' : 'CircleClose')" />
              </el-icon>
              <span class="status-text">{{ getStatusLabel(row.status) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="设备数" width="100" align="center">
          <template #default="{ row }">
            <span class="device-count">{{ row.deviceCount ?? 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="最近登录" width="180" align="center">
          <template #default="{ row }">
            <span class="last-login">{{ formatDate(row.lastLoginAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="180" align="center">
          <template #default="{ row }">
            <span class="create-time">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                text
                size="small"
                @click="openStatusDialog(row)"
              >
                状态
              </el-button>
              <!-- 预留：详情、设备等操作 -->
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 单个用户状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="修改用户状态"
      width="480px"
    >
      <div class="dialog-user-info">
        <span class="label">用户邮箱：</span>
        <span class="value">{{ statusForm.email }}</span>
      </div>
      <el-form label-width="80px">
        <el-form-item label="状态">
          <el-radio-group v-model="statusForm.status">
            <el-radio label="normal">正常</el-radio>
            <el-radio label="frozen">冻结</el-radio>
            <el-radio label="banned">封禁</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="statusForm.reason"
            placeholder="可选，填写状态变更原因"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item
          v-if="statusForm.status === 'banned'"
          label="封禁天数"
        >
          <el-input-number
            v-model="statusForm.banDuration"
            :min="1"
            :max="3650"
            placeholder="为空表示永久封禁"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStatusSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量状态对话框 -->
    <el-dialog
      v-model="batchStatusDialogVisible"
      title="批量修改用户状态"
      width="480px"
    >
      <div class="dialog-user-info">
        本次将修改 <strong>{{ selectedUserIds.length }}</strong> 个用户的状态。
      </div>
      <el-form label-width="80px">
        <el-form-item label="状态">
          <el-radio-group v-model="batchStatusForm.status">
            <el-radio label="normal">正常</el-radio>
            <el-radio label="frozen">冻结</el-radio>
            <el-radio label="banned">封禁</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="batchStatusForm.reason"
            placeholder="可选，填写状态变更原因"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item
          v-if="batchStatusForm.status === 'banned'"
          label="封禁天数"
        >
          <el-input-number
            v-model="batchStatusForm.banDuration"
            :min="1"
            :max="3650"
            placeholder="为空表示永久封禁"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchStatusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchStatusSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分页器 -->
    <div class="pagination-wrapper">
      <div class="pagination-info">
        共 {{ pagination.total }} 条记录, 当前显示 {{ paginationRange.start }}-{{ paginationRange.end }}
      </div>
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
      <div class="page-size-selector">
        <span>每页行数: </span>
        <el-select v-model="pagination.pageSize" @change="handleSizeChange" style="width: 80px">
          <el-option label="10" :value="10" />
          <el-option label="20" :value="20" />
          <el-option label="50" :value="50" />
          <el-option label="100" :value="100" />
        </el-select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Message, Phone, CircleCheck, CircleClose, Timer, ArrowDown } from '@element-plus/icons-vue'
import {
  getUsers,
  updateUserStatus,
  batchUpdateUserStatus,
  batchDeleteUsers
} from '@/api/user'

// 数据
const loading = ref(false)
const tableData = ref([])
const selectedUserIds = ref([])

// 单个状态对话框
const statusDialogVisible = ref(false)
const statusForm = reactive({
  userId: '',
  email: '',
  status: 'normal',
  reason: '',
  banDuration: null
})

// 批量状态对话框
const batchStatusDialogVisible = ref(false)
const batchStatusForm = reactive({
  status: 'normal',
  reason: '',
  banDuration: null
})

// 筛选条件
const filters = reactive({
  email: '',
  phone: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 统计信息
const statistics = computed(() => {
  const total = pagination.total
  const normal = tableData.value.filter(item => item.status === 'normal').length
  return { total, normal }
})

// 计算显示的记录范围
const paginationRange = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return { start, end }
})

// 获取列表数据
async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }
    // 移除空值
    Object.keys(params).forEach((key) => {
      if (params[key] === '' || params[key] === undefined || params[key] === null) {
        delete params[key]
      }
    })

    const response = await getUsers(params)
    if (response.success) {
      tableData.value = response.data || []
      if (response.pagination) {
        pagination.total = response.pagination.total || 0
        pagination.page = response.pagination.page || 1
        pagination.pageSize = response.pagination.pageSize || 20
      }
    }
  } catch (error) {
    ElMessage.error('获取终端用户列表失败')
  } finally {
    loading.value = false
  }
}

// 表格多选
function handleSelectionChange(selection) {
  selectedUserIds.value = selection.map(item => item.id)
}

// 打开单个状态对话框
function openStatusDialog(row) {
  statusForm.userId = row.id
  statusForm.email = row.email
  statusForm.status = row.status || 'normal'
  statusForm.reason = ''
  statusForm.banDuration = null
  statusDialogVisible.value = true
}

// 提交单个状态更新
async function handleStatusSubmit() {
  try {
    const payload = {
      status: statusForm.status,
      reason: statusForm.reason || undefined,
      banDuration: statusForm.status === 'banned' ? statusForm.banDuration : undefined
    }
    await updateUserStatus(statusForm.userId, payload)
    ElMessage.success('用户状态更新成功')
    statusDialogVisible.value = false
    fetchData()
  } catch (error) {
    // 错误统一在 request 拦截器中处理
  }
}

// 打开批量状态对话框
function openBatchStatusDialog(targetStatus) {
  if (!selectedUserIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  batchStatusForm.status = targetStatus
  batchStatusForm.reason = ''
  batchStatusForm.banDuration = null
  batchStatusDialogVisible.value = true
}

// 提交批量状态更新
async function handleBatchStatusSubmit() {
  if (!selectedUserIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  try {
    const payload = {
      ids: selectedUserIds.value,
      status: batchStatusForm.status,
      reason: batchStatusForm.reason || undefined,
      banDuration: batchStatusForm.status === 'banned' ? batchStatusForm.banDuration : undefined
    }
    await batchUpdateUserStatus(payload)
    ElMessage.success('批量更新用户状态成功')
    batchStatusDialogVisible.value = false
    fetchData()
  } catch (error) {
    // 统一处理
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedUserIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUserIds.value.length} 个用户吗？该操作不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  try {
    await batchDeleteUsers({ ids: selectedUserIds.value })
    ElMessage.success('批量删除用户成功')
    selectedUserIds.value = []
    fetchData()
  } catch (error) {
    // 统一处理
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 分页变化
function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

// 每页数量变化
function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

// 头像文字（根据邮箱）
function getAvatarText(email) {
  if (!email) return 'US'
  const name = email.split('@')[0]
  if (!name) return 'US'
  return name.substring(0, 2).toUpperCase()
}

// 头像颜色
function getAvatarColor(email) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  const str = email || ''
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 角色标签
function getRoleTagType(role) {
  const map = {
    user: 'primary',
    basic_user: 'info'
  }
  return map[role] || 'info'
}

function getRoleLabel(role) {
  const map = {
    user: '正式用户',
    basic_user: '基础用户'
  }
  return map[role] || role
}

// 状态显示
function getStatusClass(status) {
  if (status === 'normal') return 'status-normal'
  if (status === 'frozen') return 'status-frozen'
  if (status === 'banned') return 'status-banned'
  return 'status-normal'
}

function getStatusLabel(status) {
  const map = {
    normal: '正常',
    frozen: '已冻结',
    banned: '已封禁'
  }
  return map[status] || status
}

// 日期格式化
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.terminal-user-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
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

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.terminal-user-filter {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  align-items: center;
  max-width: 540px;
}

.filter-input {
  width: 200px;
}

.filter-select {
  width: 140px;
}

.statistics {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #64748b;
}

.stat-item {
  font-weight: 500;
}

.terminal-user-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.selected-info {
  font-size: 13px;
  color: #64748b;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-email {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.user-phone {
  font-size: 12px;
  color: #94a3b8;
}

.device-count {
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
}

.last-login,
.create-time {
  font-size: 13px;
  color: #64748b;
}

.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.pagination-info {
  font-size: 14px;
  color: #64748b;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid;
  background: white;
  font-size: 13px;
  font-weight: 500;
}

.status-normal {
  border-color: #10b981;
  color: #10b981;
}

.status-frozen {
  border-color: #f59e0b;
  color: #f59e0b;
}

.status-banned {
  border-color: #ef4444;
  color: #ef4444;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  line-height: 1;
}
</style>
