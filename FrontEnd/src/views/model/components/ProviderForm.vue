<template>
  <el-dialog
    v-model="visible"
    :title="formData.id ? '编辑提供商' : '新增提供商'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="left"
    >
      <el-form-item label="提供商标识" prop="name">
        <el-input v-model="formData.name" placeholder="例如：DeepSeek" :disabled="!!formData.id" />
        <div class="form-tip">唯一标识，创建后不可修改</div>
      </el-form-item>

      <el-form-item label="显示名称" prop="displayName">
        <el-input v-model="formData.displayName" placeholder="例如：DeepSeek AI" />
      </el-form-item>

      <el-form-item label="API 服务基地址" prop="baseUrl">
        <el-input v-model="formData.baseUrl" placeholder="例如：https://api.deepseek.com" />
      </el-form-item>

      <el-form-item label="官网链接" prop="website">
        <el-input v-model="formData.website" placeholder="例如：https://www.deepseek.com" />
      </el-form-item>

      <el-form-item label="Logo 链接" prop="logoUrl">
        <el-input v-model="formData.logoUrl" placeholder="Logo 图片 URL" />
      </el-form-item>

      <el-form-item label="描述信息">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="提供商描述信息"
        />
      </el-form-item>

      <el-form-item label="额度" prop="quota">
        <el-input-number
          v-model="formData.quota"
          :min="0"
          :precision="2"
          placeholder="由API Key额度汇总计算"
          style="width: 100%"
          disabled
        />
        <div class="form-tip">额度由该提供商关联的 API Key 额度汇总计算，不能手动设置</div>
      </el-form-item>

      <el-form-item label="额度单位" prop="quotaUnit">
        <el-select v-model="formData.quotaUnit" placeholder="请选择额度单位" style="width: 100%">
          <el-option label="积分" value="points" />
          <el-option label="元" value="yuan" />
          <el-option label="美元" value="usd" />
        </el-select>
      </el-form-item>

      <el-form-item label="API Key切换阈值">
        <el-input-number
          v-model="formData.apiKeyLowBalanceThreshold"
          :min="0"
          :step="100"
          :precision="0"
          placeholder="默认1000"
          style="width: 100%"
        />
        <div class="form-tip">
          当同一提供商下某个 API Key 的剩余额度 &lt; 阈值时，授权会优先选择其他余额更充足的 API Key
        </div>
      </el-form-item>

      <el-form-item label="音色克隆API配置">
        <div class="kv-list">
          <div v-for="(row, idx) in voiceCloneApiRows" :key="row._key" class="kv-row">
            <el-input v-model="row.name" placeholder="名称（展示用）" />
            <el-input v-model="row.path" placeholder="Path（可相对 baseUrl，也可完整URL）" />
            <el-button
              type="danger"
              plain
              @click="removeVoiceCloneRow(idx)"
              :disabled="voiceCloneApiRows.length <= 1"
            >
              删除
            </el-button>
          </div>
          <el-button type="primary" plain :icon="Plus" @click="addVoiceCloneRow">新增</el-button>
        </div>
        <div class="form-tip">
          用于“音色克隆”下拉选择（name/path）。path 可为完整URL或相对 baseUrl 的路径。
        </div>
      </el-form-item>

      <el-form-item label="复刻单次积分">
        <el-input-number
          v-model="formData.voiceCloneCreditsPerCall"
          :min="0"
          :precision="2"
          :step="1"
          style="width: 100%"
        />
        <div class="form-tip">
          每成功一次克隆增加所选 Key 已用积分；0 不扣。流水表 voice_clone_credit_logs。
        </div>
      </el-form-item>

      <el-form-item label="支持API Key创建">
        <el-switch v-model="formData.supportsApiKeyCreation" />
        <div class="form-tip">是否支持通过接口创建API Key（如grsai）</div>
      </el-form-item>

      <el-form-item label="账户Token" prop="mainAccountToken" :rules="mainAccountTokenRules">
        <el-input
          v-model="formData.mainAccountToken"
          type="textarea"
          :rows="2"
          placeholder="请输入主账户token"
        />
        <div class="form-tip" v-if="!formData.supportsApiKeyCreation">
          不支持API Key创建时，账户Token可选；支持API Key创建时，账户Token必填
        </div>
      </el-form-item>

      <el-form-item label="是否启用">
        <el-switch v-model="formData.isActive" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  provider: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  name: '',
  displayName: '',
  baseUrl: '',
  website: '',
  logoUrl: '',
  description: '',
  quota: null,
  quotaUnit: null,
  apiKeyLowBalanceThreshold: 1000,
  voiceCloneCreditsPerCall: 0,
  mainAccountToken: '',
  supportsApiKeyCreation: false,
  isActive: true
})

const voiceCloneApiRows = ref([{ _key: `${Date.now()}_0`, name: '', path: '' }])

function resetVoiceCloneRowsFromJson(jsonStr) {
  if (!jsonStr) {
    voiceCloneApiRows.value = [{ _key: `${Date.now()}_0`, name: '', path: '' }]
    return
  }
  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed) && parsed.length) {
      voiceCloneApiRows.value = parsed.map((item, idx) => ({
        _key: `${Date.now()}_${idx}`,
        name: item?.name || '',
        path: item?.path || ''
      }))
      return
    }
  } catch {
    // ignore
  }
  voiceCloneApiRows.value = [{ _key: `${Date.now()}_0`, name: '', path: '' }]
}

function addVoiceCloneRow() {
  voiceCloneApiRows.value.push({
    _key: `${Date.now()}_${voiceCloneApiRows.value.length}`,
    name: '',
    path: ''
  })
}

function removeVoiceCloneRow(idx) {
  if (voiceCloneApiRows.value.length <= 1) return
  voiceCloneApiRows.value.splice(idx, 1)
}

function buildVoiceCloneApisJson() {
  const rows = (voiceCloneApiRows.value || [])
    .map(r => ({
      name: String(r.name || '').trim(),
      path: String(r.path || '').trim()
    }))
    .filter(r => r.name && r.path)

  if (!rows.length) return null
  return JSON.stringify(rows)
}

// 账户Token验证规则（动态）
const mainAccountTokenRules = computed(() => {
  if (formData.supportsApiKeyCreation) {
    return [{ required: true, message: '支持API Key创建时，账户Token为必填项', trigger: 'blur' }]
  }
  return []
})

const rules = {
  name: [
    { required: true, message: '请输入提供商标识', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_.-]+$/,
      message: '标识只能包含字母、数字、下划线、点号和连字符',
      trigger: 'blur'
    }
  ],
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  baseUrl: [
    { required: true, message: '请输入 API 服务基地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ],
  website: [
    { required: true, message: '请输入官网链接', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ],
  logoUrl: [
    { required: true, message: '请输入 Logo 链接', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ],
  quota: [],
  quotaUnit: [{ required: true, message: '请选择额度单位', trigger: 'change' }]
}

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.provider) {
      Object.assign(formData, {
        id: props.provider.id,
        name: props.provider.name || '',
        displayName: props.provider.displayName || '',
        baseUrl: props.provider.baseUrl || '',
        website: props.provider.website || '',
        logoUrl: props.provider.logoUrl || '',
        description: props.provider.description || '',
        quota:
          props.provider.quota !== undefined && props.provider.quota !== null
            ? parseFloat(props.provider.quota)
            : null,
        quotaUnit: props.provider.quotaUnit || null,
        apiKeyLowBalanceThreshold:
          props.provider.apiKeyLowBalanceThreshold !== undefined &&
          props.provider.apiKeyLowBalanceThreshold !== null
            ? parseFloat(props.provider.apiKeyLowBalanceThreshold)
            : 1000,
        voiceCloneCreditsPerCall:
          props.provider.voiceCloneCreditsPerCall !== undefined &&
          props.provider.voiceCloneCreditsPerCall !== null
            ? parseFloat(props.provider.voiceCloneCreditsPerCall)
            : 0,
        mainAccountToken: props.provider.mainAccountToken || '',
        supportsApiKeyCreation:
          props.provider.supportsApiKeyCreation !== undefined
            ? props.provider.supportsApiKeyCreation
            : false,
        isActive: props.provider.isActive !== undefined ? props.provider.isActive : true
      })
      resetVoiceCloneRowsFromJson(props.provider.voiceCloneApis || '')
    } else if (val) {
      // 重置表单
      Object.assign(formData, {
        id: null,
        name: '',
        displayName: '',
        baseUrl: '',
        website: '',
        logoUrl: '',
        description: '',
        quota: null,
        quotaUnit: null,
        apiKeyLowBalanceThreshold: 1000,
        voiceCloneCreditsPerCall: 0,
        mainAccountToken: '',
        supportsApiKeyCreation: false,
        isActive: true
      })
      resetVoiceCloneRowsFromJson('')
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
}

function handleSubmit() {
  formRef.value?.validate(valid => {
    if (valid) {
      // 额外验证：如果支持API Key创建，必须填写mainAccountToken
      if (
        formData.supportsApiKeyCreation &&
        (!formData.mainAccountToken || formData.mainAccountToken.trim() === '')
      ) {
        ElMessage.error('支持API Key创建时，账户Token为必填项')
        return
      }

      submitting.value = true
      // 处理数据，确保 quota 为 null 或数字
      const submitData = {
        ...formData,
        quota: formData.quota !== null && formData.quota !== undefined ? formData.quota : null,
        quotaUnit: formData.quotaUnit || null,
        voiceCloneApis: buildVoiceCloneApisJson(),
        mainAccountToken: formData.mainAccountToken || null
      }
      emit('success', submitData)
      submitting.value = false
    }
  })
}

// 暴露方法供父组件调用
defineExpose({
  resetForm: () => {
    formRef.value?.resetFields()
  }
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.kv-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kv-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: center;
}
</style>
