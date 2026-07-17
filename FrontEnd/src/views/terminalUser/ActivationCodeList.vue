<template>
  <div class="activation-code-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">激活码管理</h1>
        <p class="page-description">
          创建并归属到当前后台账号；可绑套餐（默认试用）、可选绑定邮箱/手机；超时未使用将自动销毁。
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="handleDestroyExpired">清理过期</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">创建 / 批量创建</el-button>
      </div>
    </div>

    <div class="filter-section">
      <el-select v-model="filters.status" placeholder="状态" clearable style="width: 140px">
        <el-option v-for="s in meta.statuses" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
      <el-select
        v-model="filters.packageId"
        placeholder="套餐"
        clearable
        filterable
        style="width: 220px"
      >
        <el-option
          v-for="pkg in packageOptions"
          :key="pkg.id"
          :label="`${pkg.displayName || pkg.name}（${pkg.type}）`"
          :value="pkg.id"
        />
      </el-select>
      <el-input
        v-model="filters.keyword"
        placeholder="搜索激活码 / 邮箱 / 手机"
        clearable
        style="width: 240px"
        @keyup.enter="handleSearch"
      />
      <el-button @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" row-key="id" style="width: 100%">
      <el-table-column prop="code" label="激活码" min-width="200">
        <template #default="{ row }">
          <code class="code-text">{{ row.code }}</code>
          <el-button type="primary" link size="small" @click="copyText(row.code)">复制</el-button>
        </template>
      </el-table-column>
      <el-table-column label="套餐" min-width="140">
        <template #default="{ row }">
          {{ row.package?.displayName || row.package?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="绑定邮箱" min-width="160">
        <template #default="{ row }">{{ row.email || '-' }}</template>
      </el-table-column>
      <el-table-column label="绑定手机" width="130">
        <template #default="{ row }">{{ row.phone || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="过期时间" width="170">
        <template #default="{ row }">{{ formatTime(row.expiresAt) }}</template>
      </el-table-column>
      <el-table-column label="创建人" width="120">
        <template #default="{ row }">{{ row.creator?.username || row.createdBy || '-' }}</template>
      </el-table-column>
      <el-table-column label="使用人" min-width="150">
        <template #default="{ row }">
          <span v-if="row.usedByUser">{{ row.usedByUser.email || row.usedByUser.phone }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'unused'"
            type="primary"
            link
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog
      v-model="formVisible"
      :title="formData.id ? '编辑激活码' : '创建激活码'"
      width="560px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">
        <el-form-item v-if="!formData.id" label="创建数量" prop="count">
          <el-input-number v-model="formData.count" :min="1" :max="meta.maxBatchCount || 200" />
          <span class="form-tip">大于 1 时为批量创建，同批共享套餐与绑定信息</span>
        </el-form-item>
        <el-form-item label="绑定套餐" prop="packageId">
          <el-select v-model="formData.packageId" filterable style="width: 100%">
            <el-option
              v-for="pkg in packageOptions"
              :key="pkg.id"
              :label="`${pkg.displayName || pkg.name}（${pkg.type}）`"
              :value="pkg.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定邮箱" prop="email">
          <el-input v-model="formData.email" clearable placeholder="可选，填写后客户端必须用此邮箱" />
        </el-form-item>
        <el-form-item label="绑定手机" prop="phone">
          <el-input v-model="formData.phone" clearable placeholder="可选，填写后客户端必须用此手机号" />
        </el-form-item>
        <el-form-item label="有效天数" prop="expiresInDays">
          <el-input-number v-model="formData.expiresInDays" :min="1" :max="3650" />
          <span class="form-tip">未使用超时将自动销毁</span>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>

      <div v-if="createdPreview.length" class="created-preview">
        <div class="preview-title">本次生成（{{ createdPreview.length }}）</div>
        <el-input
          type="textarea"
          :model-value="createdPreview.map((i) => i.code).join('\n')"
          :rows="Math.min(8, createdPreview.length)"
          readonly
        />
      </div>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  createActivationCodes,
  deleteActivationCode,
  destroyExpiredActivationCodes,
  getActivationCodeMeta,
  getActivationCodes,
  updateActivationCode
} from '@/api/activationCode'
import { getPackages } from '@/api/package'

const loading = ref(false)
const submitting = ref(false)
const formVisible = ref(false)
const formRef = ref(null)
const tableData = ref([])
const packageOptions = ref([])
const createdPreview = ref([])

const meta = reactive({
  statuses: [],
  maxBatchCount: 200,
  defaultExpireDays: 30,
  defaultPackageId: null
})

const filters = reactive({
  status: '',
  packageId: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const formData = reactive({
  id: '',
  count: 1,
  packageId: '',
  email: '',
  phone: '',
  expiresInDays: 30,
  remark: ''
})

const formRules = {
  packageId: [{ required: true, message: '请选择绑定套餐', trigger: 'change' }],
  count: [{ required: true, message: '请输入数量', trigger: 'change' }],
  expiresInDays: [{ required: true, message: '请输入有效天数', trigger: 'change' }],
  email: [
    {
      validator: (_r, v, cb) => {
        if (!v) return cb()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return cb(new Error('邮箱格式无效'))
        cb()
      },
      trigger: 'blur'
    }
  ]
}

function statusLabel(status) {
  return meta.statuses.find((s) => s.value === status)?.label || status
}

function statusType(status) {
  return (
    {
      unused: 'success',
      used: 'info',
      expired: 'warning',
      revoked: 'danger'
    }[status] || 'info'
  )
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

async function loadMeta() {
  try {
    const res = await getActivationCodeMeta()
    const data = res?.data || {}
    meta.statuses = data.statuses || []
    meta.maxBatchCount = data.maxBatchCount || 200
    meta.defaultExpireDays = data.defaultExpireDays || 30
    meta.defaultPackageId = data.defaultPackageId || null
  } catch {
    meta.statuses = [
      { value: 'unused', label: '未使用' },
      { value: 'used', label: '已使用' },
      { value: 'expired', label: '已过期' },
      { value: 'revoked', label: '已作废' }
    ]
  }
}

async function loadPackages() {
  try {
    const res = await getPackages({ page: 1, pageSize: 200, isActive: true })
    packageOptions.value = res?.data || []
  } catch {
    packageOptions.value = []
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await getActivationCodes({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
      packageId: filters.packageId || undefined,
      keyword: filters.keyword || undefined
    })
    tableData.value = res?.data || []
    pagination.total = res?.pagination?.total ?? res?.total ?? 0
  } catch (e) {
    ElMessage.error(e?.message || '加载激活码失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadList()
}

function handleReset() {
  filters.status = ''
  filters.packageId = ''
  filters.keyword = ''
  handleSearch()
}

function handlePageChange(page) {
  pagination.page = page
  loadList()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadList()
}

function resetForm() {
  formData.id = ''
  formData.count = 1
  formData.packageId = meta.defaultPackageId || packageOptions.value.find((p) => p.type === 'trial')?.id || ''
  formData.email = ''
  formData.phone = ''
  formData.expiresInDays = meta.defaultExpireDays || 30
  formData.remark = ''
  createdPreview.value = []
}

function openCreate() {
  resetForm()
  formVisible.value = true
}

function openEdit(row) {
  formData.id = row.id
  formData.count = 1
  formData.packageId = row.packageId
  formData.email = row.email || ''
  formData.phone = row.phone || ''
  formData.expiresInDays = meta.defaultExpireDays || 30
  formData.remark = row.remark || ''
  createdPreview.value = []
  formVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate().catch(() => null)
  submitting.value = true
  try {
    if (formData.id) {
      await updateActivationCode(formData.id, {
        packageId: formData.packageId,
        email: formData.email || null,
        phone: formData.phone || null,
        expiresInDays: formData.expiresInDays,
        remark: formData.remark || null
      })
      ElMessage.success('更新成功')
      formVisible.value = false
    } else {
      const res = await createActivationCodes({
        count: formData.count,
        packageId: formData.packageId,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        expiresInDays: formData.expiresInDays,
        remark: formData.remark || undefined
      })
      createdPreview.value = res?.data?.items || []
      ElMessage.success(`已创建 ${res?.data?.count || 0} 个激活码`)
      if ((res?.data?.count || 0) === 1) {
        formVisible.value = false
      }
    }
    await loadList()
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除激活码「${row.code}」？`, '确认删除', { type: 'warning' })
  try {
    await deleteActivationCode(row.id)
    ElMessage.success('已删除')
    loadList()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

async function handleDestroyExpired() {
  try {
    const res = await destroyExpiredActivationCodes()
    ElMessage.success(`已销毁 ${res?.data?.destroyed || 0} 个过期激活码`)
    loadList()
  } catch (e) {
    ElMessage.error(e?.message || '清理失败')
  }
}

onMounted(async () => {
  await Promise.all([loadMeta(), loadPackages()])
  resetForm()
  loadList()
})
</script>

<style scoped>
.activation-code-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-title {
  margin: 0 0 6px;
  font-size: 22px;
}

.page-description {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.code-text {
  margin-right: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.02em;
}

.form-tip {
  margin-left: 10px;
  color: #94a3b8;
  font-size: 12px;
}

.created-preview {
  margin-top: 12px;
}

.preview-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: #475569;
}
</style>
