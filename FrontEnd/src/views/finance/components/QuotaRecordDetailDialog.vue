<template>
  <el-dialog
    v-model="visible"
    title="额度流水详情"
    width="800px"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="record" class="record-detail">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3 class="section-title">基本信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="流水ID">
            <span class="record-id">{{ record.id }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="流水类型">
            <el-tag :type="getTypeTagType(record.type)" size="small">
              {{ getTypeLabel(record.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="变动金额">
            <span :class="['amount-value', getAmountClass(record.type)]">
              {{ getAmountPrefix(record.type) }}{{ formatNumber(record.amount) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(record.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 用户信息 -->
      <div class="detail-section" v-if="record.user">
        <h3 class="section-title">用户信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">
            {{ record.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ record.user.email || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ record.user.phone || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 套餐信息 -->
      <div class="detail-section" v-if="record.package">
        <h3 class="section-title">套餐信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="套餐ID">
            {{ record.packageId }}
          </el-descriptions-item>
          <el-descriptions-item label="套餐名称">
            {{ record.package.displayName || record.package.name }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 额度变动 -->
      <div class="detail-section">
        <h3 class="section-title">额度变动</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="变动前额度">
            {{ formatNumber(record.before) }}
          </el-descriptions-item>
          <el-descriptions-item label="变动后额度">
            {{ formatNumber(record.after) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 关联信息 -->
      <div class="detail-section" v-if="record.orderId || record.requestId">
        <h3 class="section-title">关联信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单ID" v-if="record.orderId">
            <span class="order-id">{{ record.orderId }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="请求ID" v-if="record.requestId">
            <span class="request-id">{{ record.requestId }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 变动原因 -->
      <div class="detail-section" v-if="record.reason">
        <h3 class="section-title">变动原因</h3>
        <div class="reason-text">{{ record.reason }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getQuotaRecordDetail } from '@/api/quotaRecord'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  recordId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = ref(props.modelValue)
const loading = ref(false)
const record = ref(null)

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.recordId) {
    fetchRecordDetail()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    record.value = null
  }
})

// 获取流水详情
async function fetchRecordDetail() {
  if (!props.recordId) return
  loading.value = true
  try {
    const response = await getQuotaRecordDetail(props.recordId)
    if (response.success) {
      record.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取流水详情失败')
  } finally {
    loading.value = false
  }
}

// 格式化数字
function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  const n = parseFloat(num)
  if (isNaN(n)) return '0'
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// 获取类型标签类型
function getTypeTagType(type) {
  const typeMap = {
    increase: 'success',
    decrease: 'danger',
    freeze: 'warning',
    unfreeze: 'info'
  }
  return typeMap[type] || ''
}

// 获取类型标签
function getTypeLabel(type) {
  const typeMap = {
    increase: '增加',
    decrease: '减少',
    freeze: '冻结',
    unfreeze: '解冻'
  }
  return typeMap[type] || type
}

// 获取金额前缀
function getAmountPrefix(type) {
  if (type === 'increase' || type === 'unfreeze') {
    return '+'
  }
  return '-'
}

// 获取金额样式类
function getAmountClass(type) {
  if (type === 'increase' || type === 'unfreeze') {
    return 'amount-positive'
  }
  return 'amount-negative'
}

function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.loading-container {
  padding: 20px;
}

.record-detail {
  padding: 0;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 12px 0;
}

.record-id,
.order-id,
.request-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #0f172a;
}

.amount-value {
  font-size: 16px;
  font-weight: 600;
}

.amount-positive {
  color: #10b981;
}

.amount-negative {
  color: #ef4444;
}

.reason-text {
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}
</style>
