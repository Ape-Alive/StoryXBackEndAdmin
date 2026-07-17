<template>
  <div class="style-library-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">风格库管理</h1>
        <p class="page-description">
          管理可复用的风格提示词条目，关联系统提示词，支持按媒介类型与场景分类筛选。
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增风格</el-button>
    </div>

    <div class="filter-section">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索名称或摘要"
        clearable
        style="width: 220px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="filters.mediaType" placeholder="媒介类型" clearable style="width: 140px">
        <el-option
          v-for="item in meta.mediaTypes"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select v-model="filters.scene" placeholder="场景分类" clearable style="width: 180px">
        <el-option
          v-for="item in meta.sceneCategories"
          :key="item.slug"
          :label="item.displayName"
          :value="item.slug"
        />
      </el-select>
      <el-select v-model="filters.isActive" placeholder="上架状态" clearable style="width: 130px">
        <el-option label="已上架" :value="true" />
        <el-option label="已下架" :value="false" />
      </el-select>
      <el-select v-model="filters.sort" placeholder="排序" style="width: 130px">
        <el-option label="推荐" value="recommend" />
        <el-option label="热度" value="hot" />
        <el-option label="最新" value="new" />
        <el-option label="排序值" value="sortOrder" />
      </el-select>
      <el-button @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%" row-key="id">
      <el-table-column label="封面" width="88" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.coverUrl"
            :src="row.coverUrl"
            :preview-src-list="[row.coverUrl]"
            fit="cover"
            class="cover-thumb"
            preview-teleported
          >
            <template #error>
              <div class="cover-thumb cover-thumb--placeholder">无效</div>
            </template>
          </el-image>
          <div v-else class="cover-thumb cover-thumb--empty">无</div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="媒介" width="90">
        <template #default="{ row }">
          {{ mediaTypeLabel(row.mediaType) }}
        </template>
      </el-table-column>
      <el-table-column label="关联系统提示词" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatSystemPrompts(row) }}
        </template>
      </el-table-column>
      <el-table-column label="场景分类" min-width="160">
        <template #default="{ row }">
          <el-tag
            v-for="slug in row.tags?.scenes || []"
            :key="slug"
            size="small"
            class="scene-tag"
          >
            {{ sceneLabel(slug) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="usageCount" label="使用次数" width="90" align="center" />
      <el-table-column prop="recommendScore" label="推荐分" width="80" align="center" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '已上架' : '已下架' }}
          </el-tag>
          <el-tag v-if="row.isFeatured" type="warning" size="small" class="featured-tag">精选</el-tag>
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
      :title="formData.id ? '编辑风格' : '新增风格'"
      width="720px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        class="catalog-binding-form"
      >
        <CatalogRoleBindingField
          v-model:client-role-bind-all="formData.clientRoleBindAll"
          v-model:client-role-ids="formData.clientRoleIds"
          required
        />
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="风格名称" />
        </el-form-item>
        <el-form-item label="摘要" prop="summary">
          <el-input v-model="formData.summary" type="textarea" :rows="2" placeholder="简短描述（可选）" />
        </el-form-item>
        <el-form-item label="封面 URL" prop="coverUrl">
          <el-input v-model="formData.coverUrl" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="媒介类型" prop="mediaType">
          <el-select v-model="formData.mediaType" style="width: 100%">
            <el-option
              v-for="item in meta.mediaTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="系统提示词">
          <el-select
            v-model="formData.systemPromptIds"
            multiple
            filterable
            clearable
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            :loading="systemPromptsLoading"
            placeholder="可选，选择 type=system 的提示词（可多选）"
          >
            <el-option
              v-for="p in systemPrompts"
              :key="p.id"
              :label="`${p.title} (${p.functionKey || p.id})`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="风格标识" prop="stylePromptKey">
          <el-input v-model="formData.stylePromptKey" placeholder="可选，内部唯一标识" />
        </el-form-item>
        <el-form-item label="场景分类" prop="sceneSlugs">
          <el-select v-model="formData.sceneSlugs" multiple filterable style="width: 100%">
            <el-option
              v-for="item in meta.sceneCategories"
              :key="item.slug"
              :label="item.displayName"
              :value="item.slug"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="formData.labelTags"
            multiple
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="输入后回车添加标签"
          />
        </el-form-item>
        <el-form-item label="风格正文" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="8"
            placeholder="风格提示词正文（核心字段）"
          />
        </el-form-item>
        <el-form-item label="推荐分">
          <el-input-number v-model="formData.recommendScore" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="上架">
          <el-switch v-model="formData.isActive" />
        </el-form-item>
        <el-form-item label="精选">
          <el-switch v-model="formData.isFeatured" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="风格详情" width="720px" destroy-on-close>
      <el-descriptions v-if="detailItem" :column="1" border>
        <el-descriptions-item label="封面">
          <el-image
            v-if="detailItem.coverUrl"
            :src="detailItem.coverUrl"
            :preview-src-list="[detailItem.coverUrl]"
            fit="cover"
            class="cover-detail"
            preview-teleported
          />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="名称">{{ detailItem.name }}</el-descriptions-item>
        <el-descriptions-item label="摘要">{{ detailItem.summary || '-' }}</el-descriptions-item>
        <el-descriptions-item label="媒介类型">{{ mediaTypeLabel(detailItem.mediaType) }}</el-descriptions-item>
        <el-descriptions-item label="系统提示词">
          {{ formatSystemPrompts(detailItem) }}
        </el-descriptions-item>
        <el-descriptions-item label="风格标识">{{ detailItem.stylePromptKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="场景分类">
          <el-tag
            v-for="slug in detailItem.tags?.scenes || []"
            :key="slug"
            size="small"
            class="scene-tag"
          >
            {{ sceneLabel(slug) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标签">
          <template v-if="detailItem.tags?.labels?.length">
            <el-tag v-for="label in detailItem.tags.labels" :key="label" size="small" class="scene-tag">
              {{ label }}
            </el-tag>
          </template>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="使用次数">{{ detailItem.usageCount ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="推荐分">{{ detailItem.recommendScore ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="排序值">{{ detailItem.sortOrder ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ detailItem.isActive ? '已上架' : '已下架' }}
          <el-tag v-if="detailItem.isFeatured" type="warning" size="small" style="margin-left: 8px">精选</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="风格正文">
          <pre class="content-pre">{{ detailItem.content }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEditFromDetail">编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getPrompts } from '@/api/prompt'
import CatalogRoleBindingField from '@/views/components/CatalogRoleBindingField.vue'
import {
  getStyleLibraryMeta,
  getStyleLibraryList,
  getStyleLibraryById,
  createStyleLibraryItem,
  updateStyleLibraryItem,
  deleteStyleLibraryItem
} from '@/api/styleLibrary'

const loading = ref(false)
const submitting = ref(false)
const systemPromptsLoading = ref(false)
const tableData = ref([])
const systemPrompts = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const detailItem = ref(null)
const formRef = ref(null)

const meta = reactive({
  mediaTypes: [],
  sceneCategories: []
})

const filters = reactive({
  keyword: '',
  mediaType: '',
  scene: '',
  isActive: undefined,
  sort: 'recommend'
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const defaultForm = () => ({
  id: '',
  name: '',
  summary: '',
  coverUrl: '',
  mediaType: 'image',
  systemPromptIds: [],
  stylePromptKey: '',
  content: '',
  sceneSlugs: [],
  labelTags: [],
  recommendScore: 0,
  sortOrder: 0,
  isActive: false,
  isFeatured: false,
  clientRoleBindAll: true,
  clientRoleIds: []
})

const formData = reactive(defaultForm())

const formRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  mediaType: [{ required: true, message: '请选择媒介类型', trigger: 'change' }],
  sceneSlugs: [
    {
      validator: (_rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少选择一个场景分类'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  content: [{ required: true, message: '请输入风格正文', trigger: 'blur' }]
}

function formatSystemPrompts(row) {
  const list = row?.systemPrompts
  if (Array.isArray(list) && list.length) {
    return list.map(p => p.title || p.functionKey || p.id).join('、')
  }
  if (Array.isArray(row?.systemPromptIds) && row.systemPromptIds.length) {
    return row.systemPromptIds.join('、')
  }
  return '-'
}

function mediaTypeLabel(value) {
  const item = meta.mediaTypes.find(m => m.value === value)
  return item?.label || value || '-'
}

function sceneLabel(slug) {
  const item = meta.sceneCategories.find(c => c.slug === slug)
  return item?.displayName || slug
}

async function loadMeta() {
  try {
    const res = await getStyleLibraryMeta()
    if (res.success && res.data) {
      meta.mediaTypes = res.data.mediaTypes || []
      meta.sceneCategories = res.data.sceneCategories || []
    }
  } catch {
    ElMessage.error('加载风格库元数据失败')
  }
}

async function loadSystemPrompts() {
  systemPromptsLoading.value = true
  try {
    const res = await getPrompts({ type: 'system', page: 1, pageSize: 200, isActive: true })
    if (res.success) {
      systemPrompts.value = res.data || []
    }
  } catch {
    ElMessage.error('加载系统提示词失败')
  } finally {
    systemPromptsLoading.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      sort: filters.sort || 'recommend'
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.mediaType) params.mediaType = filters.mediaType
    if (filters.scene) params.scene = filters.scene
    if (filters.isActive !== undefined && filters.isActive !== '') {
      params.isActive = filters.isActive
    }

    const res = await getStyleLibraryList(params)
    if (res.success) {
      tableData.value = res.data || []
      if (res.pagination) {
        pagination.total = res.pagination.total || 0
        pagination.page = res.pagination.page || pagination.page
        pagination.pageSize = res.pagination.pageSize || pagination.pageSize
      }
    }
  } catch {
    ElMessage.error('获取风格库列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  filters.keyword = ''
  filters.mediaType = ''
  filters.scene = ''
  filters.isActive = undefined
  filters.sort = 'recommend'
  pagination.page = 1
  fetchData()
}

function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

function resetForm() {
  Object.assign(formData, defaultForm())
  formRef.value?.clearValidate()
}

function fillFormFromRow(row) {
  Object.assign(formData, {
    id: row.id,
    name: row.name || '',
    summary: row.summary || '',
    coverUrl: row.coverUrl || '',
    mediaType: row.mediaType || 'image',
    systemPromptIds: [...(row.systemPromptIds || row.systemPrompts?.map(p => p.id) || [])],
    stylePromptKey: row.stylePromptKey || '',
    content: row.content || '',
    sceneSlugs: [...(row.tags?.scenes || [])],
    labelTags: [...(row.tags?.labels || [])],
    recommendScore: row.recommendScore ?? 0,
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive === true,
    isFeatured: row.isFeatured === true,
    clientRoleBindAll: row.clientRoleBindAll !== false,
    clientRoleIds: Array.isArray(row.clientRoleIds) ? [...row.clientRoleIds] : []
  })
}

function handleAdd() {
  resetForm()
  formVisible.value = true
}

async function handleView(row) {
  try {
    const res = await getStyleLibraryById(row.id)
    if (res.success) {
      detailItem.value = res.data
      detailVisible.value = true
    }
  } catch {
    ElMessage.error('获取详情失败')
  }
}

function handleEdit(row) {
  fillFormFromRow(row)
  formVisible.value = true
}

function handleEditFromDetail() {
  if (!detailItem.value) return
  fillFormFromRow(detailItem.value)
  detailVisible.value = false
  formVisible.value = true
}

function buildPayload() {
  const tags = {
    scenes: formData.sceneSlugs,
    labels: formData.labelTags || []
  }
  const payload = {
    name: formData.name,
    summary: formData.summary || null,
    coverUrl: formData.coverUrl || null,
    mediaType: formData.mediaType,
    stylePromptKey: formData.stylePromptKey || null,
    content: formData.content,
    systemPromptIds: formData.systemPromptIds,
    tags,
    recommendScore: formData.recommendScore,
    sortOrder: formData.sortOrder,
    isActive: formData.isActive,
    isFeatured: formData.isFeatured,
    clientRoleBindAll: formData.clientRoleBindAll,
    clientRoleIds: formData.clientRoleIds
  }
  return payload
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = buildPayload()
    const res = formData.id
      ? await updateStyleLibraryItem(formData.id, payload)
      : await createStyleLibraryItem(payload)

    if (res.success) {
      ElMessage.success(formData.id ? '更新成功' : '创建成功')
      formVisible.value = false
      fetchData()
    }
  } catch {
    /* 错误由拦截器提示 */
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定下架风格「${row.name}」吗？`, '下架确认', {
      confirmButtonText: '下架',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await deleteStyleLibraryItem(row.id)
    if (res.success) {
      ElMessage.success('已下架')
      fetchData()
    }
  } catch {
    /* cancelled */
  }
}

onMounted(async () => {
  await loadMeta()
  await loadSystemPrompts()
  fetchData()
})
</script>

<style scoped>
.catalog-binding-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}

.style-library-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

.page-description {
  margin: 0;
  color: #64748b;
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

.scene-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}

.cover-thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  display: block;
  margin: 0 auto;
  background: #f1f5f9;
}

.cover-thumb--empty,
.cover-thumb--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #94a3b8;
  border: 1px dashed #cbd5e1;
}

.cover-detail {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
}

.featured-tag {
  margin-left: 6px;
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.content-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  max-height: 320px;
  overflow: auto;
}
</style>
