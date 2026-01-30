<template>
  <el-dialog
    v-model="visible"
    title="订单详情"
    width="800px"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="order" class="order-detail">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3 class="section-title">基本信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">
            <span class="order-no">{{ order.orderNo }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <div :class="['status-badge', getStatusClass(order.status)]">
              <el-icon class="status-icon">
                <component :is="getStatusIcon(order.status)" />
              </el-icon>
              <span class="status-text">{{ getStatusLabel(order.status) }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="订单类型">
            <el-tag :type="getTypeTagType(order.type)" size="small">
              {{ getTypeLabel(order.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(order.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付时间" v-if="order.paidAt">
            {{ formatDateTime(order.paidAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="取消时间" v-if="order.cancelledAt">
            {{ formatDateTime(order.cancelledAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="过期时间" v-if="order.expiresAt">
            {{ formatDateTime(order.expiresAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 用户信息 -->
      <div class="detail-section" v-if="order.user">
        <h3 class="section-title">用户信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">
            {{ order.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ order.user.email || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ order.user.phone || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 套餐信息 -->
      <div class="detail-section" v-if="order.package">
        <h3 class="section-title">套餐信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="套餐ID">
            {{ order.packageId }}
          </el-descriptions-item>
          <el-descriptions-item label="套餐名称">
            {{ order.package.displayName || order.package.name }}
          </el-descriptions-item>
          <el-descriptions-item label="套餐标识">
            {{ order.package.name }}
          </el-descriptions-item>
          <el-descriptions-item label="套餐类型">
            {{ getPackageTypeLabel(order.package.type) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 金额信息 -->
      <div class="detail-section">
        <h3 class="section-title">金额信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单金额">
            ¥{{ formatNumber(order.amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="折扣" v-if="order.discount && order.discount > 0">
            {{ order.discount }}%
          </el-descriptions-item>
          <el-descriptions-item label="实付金额">
            <span class="final-amount">¥{{ formatNumber(order.finalAmount) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="货币单位">
            {{ order.currency || 'CNY' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 订单描述 -->
      <div class="detail-section" v-if="order.description">
        <h3 class="section-title">订单描述</h3>
        <div class="description-text">{{ order.description }}</div>
      </div>

      <!-- 支付记录 -->
      <div class="detail-section" v-if="order.payments && order.payments.length > 0">
        <h3 class="section-title">支付记录</h3>
        <el-table :data="order.payments" border>
          <el-table-column label="支付单号" prop="paymentNo" min-width="180" />
          <el-table-column label="支付方式" prop="paymentMethod" width="120" />
          <el-table-column label="支付平台" prop="paymentPlatform" width="120" />
          <el-table-column label="支付金额" width="120" align="right">
            <template #default="{ row }">
              ¥{{ formatNumber(row.amount) }}
            </template>
          </el-table-column>
          <el-table-column label="支付状态" width="120" align="center">
            <template #default="{ row }">
              <div :class="['status-badge', getPaymentStatusClass(row.status)]">
                {{ getPaymentStatusLabel(row.status) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="支付时间" width="160" align="center">
            <template #default="{ row }">
              <span v-if="row.paidAt">{{ formatDateTime(row.paidAt) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
        </el-table>
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
import { CircleCheck, CircleClose, Clock, Warning } from '@element-plus/icons-vue'
import { getOrderDetail } from '@/api/order'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  orderId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = ref(props.modelValue)
const loading = ref(false)
const order = ref(null)

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.orderId) {
    fetchOrderDetail()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    order.value = null
  }
})

// 获取订单详情
async function fetchOrderDetail() {
  if (!props.orderId) return
  loading.value = true
  try {
    const response = await getOrderDetail(props.orderId)
    if (response.success) {
      order.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取订单详情失败')
  } finally {
    loading.value = false
  }
}

// 格式化数字
function formatNumber(num) {
  if (num === null || num === undefined) return '0.00'
  const n = parseFloat(num)
  if (isNaN(n)) return '0.00'
  return n.toFixed(2)
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// 获取订单类型标签类型
function getTypeTagType(type) {
  const typeMap = {
    purchase: 'success',
    renewal: 'info',
    upgrade: 'warning'
  }
  return typeMap[type] || ''
}

// 获取订单类型标签
function getTypeLabel(type) {
  const typeMap = {
    purchase: '购买',
    renewal: '续费',
    upgrade: '升级'
  }
  return typeMap[type] || type
}

// 获取状态样式类
function getStatusClass(status) {
  const statusMap = {
    pending: 'status-pending',
    paid: 'status-paid',
    cancelled: 'status-cancelled',
    refunded: 'status-refunded',
    expired: 'status-expired'
  }
  return statusMap[status] || ''
}

// 获取状态图标
function getStatusIcon(status) {
  const iconMap = {
    pending: Clock,
    paid: CircleCheck,
    cancelled: CircleClose,
    refunded: Warning,
    expired: CircleClose
  }
  return iconMap[status] || CircleClose
}

// 获取状态标签
function getStatusLabel(status) {
  const statusMap = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消',
    refunded: '已退款',
    expired: '已过期'
  }
  return statusMap[status] || status
}

// 获取套餐类型标签
function getPackageTypeLabel(type) {
  const typeMap = {
    free: '免费',
    paid: '付费',
    trial: '试用'
  }
  return typeMap[type] || type
}

// 获取支付状态样式类
function getPaymentStatusClass(status) {
  const statusMap = {
    pending: 'status-pending',
    success: 'status-paid',
    failed: 'status-cancelled',
    cancelled: 'status-cancelled',
    refunded: 'status-refunded'
  }
  return statusMap[status] || ''
}

// 获取支付状态标签
function getPaymentStatusLabel(status) {
  const statusMap = {
    pending: '待支付',
    success: '支付成功',
    failed: '支付失败',
    cancelled: '已取消',
    refunded: '已退款'
  }
  return statusMap[status] || status
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

.order-detail {
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

.order-no {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #0f172a;
  font-weight: 600;
}

.final-amount {
  font-size: 16px;
  font-weight: 600;
  color: #10b981;
}

.description-text {
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}

.text-muted {
  color: #94a3b8;
}

/* 状态样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-icon {
  font-size: 14px;
}

.status-pending {
  background: #fef3c7;
  color: #f59e0b;
}

.status-paid {
  background: #d1fae5;
  color: #10b981;
}

.status-cancelled {
  background: #fee2e2;
  color: #ef4444;
}

.status-refunded {
  background: #e0e7ff;
  color: #6366f1;
}

.status-expired {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
