<template>
  <div class="dashboard-page" v-loading="loading">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">AI能力中台数据大盘</h1>
        <p class="page-description">实时监控模型调用、财务流水及风控状态</p>
      </div>
      <router-link to="/model/provider">
        <el-button type="primary">系统配置</el-button>
      </router-link>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-cards">
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-revenue">
          <el-icon :size="28"><Wallet /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">今日营收</div>
          <div class="kpi-value">¥{{ formatRevenue(metrics.todayRevenue) }}</div>
          <div
            :class="[
              'kpi-change',
              metrics.revenueChangeYesterday >= 0 ? 'kpi-change-up' : 'kpi-change-down'
            ]"
          >
            {{ formatChange(metrics.revenueChangeYesterday, '%') }} From yesterday
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-users">
          <el-icon :size="28"><UserFilled /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">新增用户</div>
          <div class="kpi-value">{{ formatNum(metrics.todayNewUsers) }}</div>
          <div
            :class="[
              'kpi-change',
              metrics.newUsersChangeYesterday >= 0 ? 'kpi-change-up' : 'kpi-change-down'
            ]"
          >
            {{ formatChange(metrics.newUsersChangeYesterday, '%') }} From yesterday
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-calls">
          <el-icon :size="28"><Lightning /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">AI调用量</div>
          <div class="kpi-value">{{ formatNum(metrics.todayAiCallVolume) }}</div>
          <div
            :class="[
              'kpi-change',
              metrics.aiCallVolumeChangeYesterday >= 0 ? 'kpi-change-up' : 'kpi-change-down'
            ]"
          >
            {{ formatChange(metrics.aiCallVolumeChangeYesterday, '%') }} From yesterday
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-risk">
          <el-icon :size="28"><Warning /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">风险预警</div>
          <div class="kpi-value">{{ metrics.todayRiskAlerts ?? '-' }}</div>
          <div
            :class="[
              'kpi-change',
              metrics.riskAlertsChangeYesterday <= 0 ? 'kpi-change-up' : 'kpi-change-down'
            ]"
          >
            {{ formatRiskChange(metrics.riskAlertsChangeYesterday) }} From yesterday
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <div class="chart-header">
            <span>调用与积分趋势</span>
            <el-select
              v-model="timeRange"
              size="small"
              style="width: 120px"
              @change="handleTimeRangeChange"
            >
              <el-option label="最近24小时" value="24h" />
              <el-option label="最近7天" value="7d" />
              <el-option label="最近30天" value="30d" />
            </el-select>
          </div>
        </template>
        <div ref="chartTrendRef" class="chart-container"></div>
      </el-card>
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <span>模型负载占比</span>
        </template>
        <div ref="chartDonutRef" class="chart-container"></div>
      </el-card>
    </div>

    <!-- 底部：提供商健康度 + 风控触发记录 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <div class="chart-header">
            <span>模型提供商健康度</span>
            <router-link to="/model/provider">
              <el-button type="primary" link size="small">管理提供商</el-button>
            </router-link>
          </div>
        </template>
        <div class="provider-table">
          <el-table :data="providerHealth" style="width: 100%">
            <el-table-column label="提供商名称" prop="providerName" min-width="140" />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <div :class="['status-badge', 'status-' + row.status]">
                  <el-icon v-if="row.status === 'healthy'"><CircleCheck /></el-icon>
                  <el-icon v-else-if="row.status === 'warning'"><Warning /></el-icon>
                  <el-icon v-else><CircleClose /></el-icon>
                  <span>{{ statusLabel(row.status) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="剩余额度" width="180">
              <template #default="{ row }">
                <div class="quota-cell">
                  <el-progress
                    :percentage="row.remainingQuotaPercentage ?? 0"
                    :stroke-width="8"
                    :color="getQuotaColor(row.remainingQuotaPercentage)"
                  />
                  <span class="quota-text">{{ row.remainingQuotaPercentage ?? 0 }}% remaining</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="延迟" width="90" align="center">
              <template #default="{ row }">
                {{ row.latencyMs != null ? row.latencyMs + 'ms' : '-' }}
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!providerHealth.length" class="empty-tip">暂无提供商数据</div>
        </div>
      </el-card>
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <div class="chart-header">
            <span>
              <el-icon color="#ef4444"><Warning /></el-icon>
              实时风控触发记录
            </span>
            <router-link to="/risk/rules">
              <el-button type="primary" link size="small">全部记录</el-button>
            </router-link>
          </div>
        </template>
        <div class="risk-list">
          <div v-for="item in riskTriggers" :key="item.id" class="risk-item">
            <el-icon class="risk-icon"><CircleClose /></el-icon>
            <div class="risk-content">
              <div class="risk-user">user_{{ formatUserId(item.userId) }}</div>
              <div class="risk-event">{{ item.triggerReason }}</div>
              <div class="risk-meta">
                {{ formatTimeAgo(item.timestamp) }} · 动作: {{ item.actionTaken }}
              </div>
              <el-button type="primary" link size="small">详情</el-button>
            </div>
          </div>
          <div v-if="!riskTriggers.length" class="empty-tip">暂无风控触发记录</div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  Wallet,
  UserFilled,
  Lightning,
  Warning,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'
import {
  getSummaryMetrics,
  getCallPointsTrend,
  getModelLoadRatio,
  getModelProviderHealth,
  getRealtimeRiskTriggers
} from '@/api/dashboard'

const loading = ref(false)
const metrics = ref({})
const trendData = ref([])
const modelLoad = ref([])
const providerHealth = ref([])
const riskTriggers = ref([])
const timeRange = ref('24h')

const chartTrendRef = ref(null)
const chartDonutRef = ref(null)
let chartTrend = null
let chartDonut = null

const MODEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']

function formatRevenue(val) {
  if (val == null || val === '') return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNum(val) {
  if (val == null || val === '') return '-'
  return Number(val).toLocaleString('zh-CN')
}

function formatChange(val, suffix = '') {
  if (val == null || val === '') return '-'
  const v = Number(val)
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v}${suffix}`
}

function formatRiskChange(val) {
  if (val == null || val === 0) return '0'
  const v = Number(val)
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v}`
}

function formatUserId(userId) {
  if (!userId || userId === '-') return '-'
  return userId.length > 8 ? userId.slice(-6) : userId
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return d.toLocaleDateString('zh-CN')
}

function statusLabel(status) {
  const map = { healthy: 'Healthy', warning: 'Warning', critical: 'Critical' }
  return map[status] || status
}

function getQuotaColor(pct) {
  if (pct == null) return '#e2e8f0'
  if (pct < 20) return '#ef4444'
  if (pct < 50) return '#f59e0b'
  return '#10b981'
}

async function fetchAll() {
  loading.value = true
  try {
    const [mRes, tRes, lRes, pRes, rRes] = await Promise.all([
      getSummaryMetrics(),
      getCallPointsTrend(timeRange.value),
      getModelLoadRatio(),
      getModelProviderHealth(),
      getRealtimeRiskTriggers(5)
    ])
    if (mRes.success) metrics.value = mRes.data || {}
    if (tRes.success) trendData.value = tRes.data || []
    if (lRes.success) modelLoad.value = lRes.data || []
    if (pRes.success) providerHealth.value = pRes.data || []
    if (rRes.success) riskTriggers.value = rRes.data || []
  } catch (e) {
    ElMessage.error('获取大盘数据失败')
  } finally {
    loading.value = false
  }
}

function handleTimeRangeChange() {
  fetchAll()
}

function initCharts() {
  if (chartTrendRef.value && !chartTrend) chartTrend = echarts.init(chartTrendRef.value)
  if (chartDonutRef.value && !chartDonut) chartDonut = echarts.init(chartDonutRef.value)
  updateCharts()
}

function updateCharts() {
  if (chartTrend && chartTrendRef.value) {
    const xData = trendData.value.map(d => d.timestamp || '')
    const callData = trendData.value.map(d => d.callVolume || 0)
    const pointsData = trendData.value.map(d => d.pointsVolume || 0)
    chartTrend.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          const p0 = params[0]
          const idx = p0.dataIndex
          const c = callData[idx]
          const p = pointsData[idx]
          return `${p0.name}<br/>调用: ${c}<br/>积分: ${Number(p).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        }
      },
      legend: {
        data: ['调用', '积分'],
        bottom: 0,
        itemGap: 16
      },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: xData, boundaryGap: true },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '调用',
          type: 'line',
          data: callData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: 'rgba(59, 130, 246, 0.2)' }
        },
        {
          name: '积分',
          type: 'bar',
          data: pointsData,
          barWidth: '50%',
          itemStyle: { color: '#8b5cf6' }
        }
      ]
    })
  }

  if (chartDonut && chartDonutRef.value) {
    const data = modelLoad.value.map((m, i) => ({
      name: m.modelName || m.modelId,
      value: m.percentage ?? 0,
      itemStyle: { color: MODEL_COLORS[i % MODEL_COLORS.length] }
    }))
    const total = data.reduce((s, d) => s + d.value, 0)
    chartDonut.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}%'
      },
      legend: {
        orient: 'vertical',
        right: 20,
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12, color: '#475569' }
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: params => (params.percent >= 5 ? `${params.percent}%` : ''),
            fontSize: 11
          },
          labelLine: { show: true, length: 8, length2: 4 },
          minAngle: 5,
          data: total > 0 ? data : [{ name: '无数据', value: 1, itemStyle: { color: '#e2e8f0' } }],
          emphasis: { scale: true, scaleSize: 5 }
        }
      ]
    })
  }
}

function resizeCharts() {
  chartTrend?.resize()
  chartDonut?.resize()
}

watch([trendData, modelLoad], () => updateCharts(), { deep: true })

onMounted(async () => {
  await fetchAll()
  await nextTick()
  initCharts()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  chartTrend?.dispose()
  chartDonut?.dispose()
})
</script>

<style scoped>
.dashboard-page {
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

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.kpi-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.kpi-icon-revenue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.kpi-icon-users {
  background: linear-gradient(135deg, #10b981, #059669);
}

.kpi-icon-calls {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.kpi-icon-risk {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.kpi-content {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.kpi-change {
  font-size: 12px;
  margin-top: 4px;
}

.kpi-change-up {
  color: #10b981;
}

.kpi-change-down {
  color: #ef4444;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 8px;
}

.chart-card :deep(.el-card__header) {
  font-weight: 600;
  color: #0f172a;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 280px;
  min-height: 200px;
}

.provider-table {
  min-height: 120px;
}

.quota-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quota-text {
  font-size: 12px;
  color: #64748b;
  min-width: 70px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-healthy {
  background: #dcfce7;
  color: #16a34a;
}

.status-warning {
  background: #fef3c7;
  color: #d97706;
}

.status-critical {
  background: #fee2e2;
  color: #dc2626;
}

.risk-list {
  min-height: 160px;
}

.risk-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.risk-item:last-child {
  border-bottom: none;
}

.risk-icon {
  color: #ef4444;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.risk-content {
  flex: 1;
  min-width: 0;
}

.risk-user {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.risk-event {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.risk-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.empty-tip {
  color: #94a3b8;
  font-size: 13px;
  padding: 24px 0;
  text-align: center;
}

@media (max-width: 1200px) {
  .kpi-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
