<template>
  <div class="camera-movement-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">运镜库管理</h1>
        <p class="page-description">管理视频生成可用的运镜模板，支持官方预设与自定义运镜。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增运镜</el-button>
    </div>

    <div class="filter-section">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索名称、标签或 key"
        clearable
        style="width: 240px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="filters.type" placeholder="类型" clearable style="width: 140px">
        <el-option
          v-for="item in meta.types"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select v-model="filters.isActive" placeholder="状态" clearable style="width: 130px">
        <el-option label="已启用" :value="true" />
        <el-option label="已停用" :value="false" />
      </el-select>
      <el-button @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%" row-key="id">
      <el-table-column label="预览" width="100" align="center">
        <template #default="{ row }">
          <video
            v-if="row.previewUrl"
            :src="row.previewUrl"
            class="preview-video"
            muted
            loop
            playsinline
            @mouseenter="($event.target).play()"
            @mouseleave="($event.target).pause()"
          />
          <div v-else class="preview-placeholder">无</div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="key" label="Key" min-width="140" show-overflow-tooltip />
      <el-table-column prop="tagLabel" label="标签文案" min-width="140" show-overflow-tooltip />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="row.type === 'official' ? 'warning' : 'info'" size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="70" align="center" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleView(row)">详情</el-button>
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, prev, pager, next, sizes"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog
      v-model="formVisible"
      :title="formData.id ? '编辑运镜' : '新增运镜'"
      width="720px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="110px"
        class="catalog-binding-form"
      >
        <CatalogRoleBindingField
          v-model:client-role-bind-all="formData.clientRoleBindAll"
          v-model:client-role-ids="formData.clientRoleIds"
          required
        />
        <el-form-item label="Key" prop="key">
          <el-input v-model="formData.key" placeholder="唯一标识，如 dolly_in" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="运镜名称" />
        </el-form-item>
        <el-form-item label="标签文案" prop="tagLabel">
          <el-input v-model="formData.tagLabel" placeholder="展示用标签文案" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" style="width: 100%">
            <el-option
              v-for="item in meta.types"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预览视频 URL" prop="previewUrl">
          <el-input v-model="formData.previewUrl" placeholder="https://...mp4" />
        </el-form-item>
        <el-form-item label="Prompt" prop="prompt">
          <el-input
            v-model="formData.prompt"
            type="textarea"
            :rows="5"
            placeholder="运镜提示词（英文描述）"
          />
        </el-form-item>
        <el-form-item label="排序值" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="formData.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="运镜详情" width="640px" destroy-on-close>
      <el-descriptions v-if="detailData" :column="1" border>
        <el-descriptions-item label="名称">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="Key">{{ detailData.key }}</el-descriptions-item>
        <el-descriptions-item label="标签">{{ detailData.tagLabel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeLabel(detailData.type) }}</el-descriptions-item>
        <el-descriptions-item label="排序">{{ detailData.sortOrder }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailData.isActive ? '启用' : '停用' }}</el-descriptions-item>
        <el-descriptions-item label="Prompt">
          <pre class="prompt-block">{{ detailData.prompt }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="预览">
          <video v-if="detailData.previewUrl" :src="detailData.previewUrl" controls class="detail-video" />
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  createCameraMovementLibraryItem,
  deleteCameraMovementLibraryItem,
  getCameraMovementLibraryById,
  getCameraMovementLibraryList,
  getCameraMovementLibraryMeta,
  updateCameraMovementLibraryItem
} from '@/api/cameraMovementLibrary'
import CatalogRoleBindingField from '@/views/components/CatalogRoleBindingField.vue'

const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const meta = reactive({ types: [] })
const filters = reactive({
  keyword: '',
  type: '',
  isActive: undefined
})
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const formVisible = ref(false)
const detailVisible = ref(false)
const formRef = ref(null)
const detailData = ref(null)

const defaultForm = () => ({
  key: '',
  name: '',
  tagLabel: '',
  prompt: '',
  previewUrl: '',
  type: 'custom',
  isActive: true,
  sortOrder: 0,
  clientRoleBindAll: true,
  clientRoleIds: []
})

const formData = reactive(defaultForm())

const formRules = {
  key: [{ required: true, message: '请输入 Key', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  prompt: [{ required: true, message: '请输入 Prompt', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

function typeLabel(type) {
  return meta.types.find(t => t.value === type)?.label || type || '-'
}

async function loadMeta() {
  try {
    const res = await getCameraMovementLibraryMeta()
    meta.types = res.data?.types || []
  } catch {
    ElMessage.error('加载运镜库元数据失败')
  }
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      sort: 'sortOrder'
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.type) params.type = filters.type
    if (filters.isActive !== undefined && filters.isActive !== null) params.isActive = filters.isActive

    const res = await getCameraMovementLibraryList(params)
    tableData.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch {
    ElMessage.error('获取运镜库列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadList()
}

function handleReset() {
  filters.keyword = ''
  filters.type = ''
  filters.isActive = undefined
  pagination.page = 1
  loadList()
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
  Object.assign(formData, defaultForm())
  formRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  formVisible.value = true
}

async function handleView(row) {
  try {
    const res = await getCameraMovementLibraryById(row.id)
    detailData.value = res.data
    detailVisible.value = true
  } catch {
    ElMessage.error('获取详情失败')
  }
}

function handleEdit(row) {
  Object.assign(formData, {
    id: row.id,
    key: row.key,
    name: row.name,
    tagLabel: row.tagLabel || '',
    prompt: row.prompt,
    previewUrl: row.previewUrl || '',
    type: row.type || 'custom',
    isActive: row.isActive !== false,
    sortOrder: row.sortOrder ?? 0,
    clientRoleBindAll: row.clientRoleBindAll !== false,
    clientRoleIds: Array.isArray(row.clientRoleIds) ? [...row.clientRoleIds] : []
  })
  formVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async valid => {
    if (!valid) return
    submitting.value = true
    try {
      const payload = {
        key: formData.key,
        name: formData.name,
        tagLabel: formData.tagLabel || null,
        prompt: formData.prompt,
        previewUrl: formData.previewUrl || null,
        type: formData.type,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        clientRoleBindAll: formData.clientRoleBindAll,
        clientRoleIds: formData.clientRoleIds
      }
      if (formData.id) {
        await updateCameraMovementLibraryItem(formData.id, payload)
        ElMessage.success('更新成功')
      } else {
        await createCameraMovementLibraryItem(payload)
        ElMessage.success('创建成功')
      }
      formVisible.value = false
      loadList()
    } catch {
      ElMessage.error(formData.id ? '更新失败' : '创建失败')
    } finally {
      submitting.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除运镜「${row.name}」？默认软删（停用），可传 hard=true 硬删。`, '确认删除', {
      type: 'warning',
      confirmButtonText: '软删',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true
    })
    await deleteCameraMovementLibraryItem(row.id)
    ElMessage.success('已停用')
    loadList()
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(async () => {
  await loadMeta()
  await loadList()
})
</script>

<style scoped>
.catalog-binding-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}

.camera-movement-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.preview-video,
.detail-video {
  width: 72px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  background: #000;
}

.detail-video {
  width: 100%;
  max-width: 480px;
  height: auto;
}

.preview-placeholder {
  width: 72px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 4px;
  color: #999;
  font-size: 12px;
}

.prompt-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}
</style>
