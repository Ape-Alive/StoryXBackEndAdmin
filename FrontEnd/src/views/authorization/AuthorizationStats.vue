<template>
  <div class="authorization-stats-page" v-loading="loading">
    <!-- 标题与刷新 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">授权统计</h1>
        <p class="page-description">实时监控全系统授权生命周期、模型热度及用户分布趋势。</p>
      </div>
      <el-button type="primary" :icon="Refresh" @click="fetchData">刷新数据</el-button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="filters.deviceFingerprint"
        placeholder="设备指纹搜索..."
        clearable
        class="filter-input"
        style="width: 200px"
      >
        <template #prefix>
          <el-icon><Monitor /></el-icon>
        </template>
      </el-input>
      <el-input
        v-model="filters.userId"
        placeholder="用户ID筛选"
        clearable
        class="filter-input"
        style="width: 180px"
      >
        <template #prefix>
          <el-icon><User /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="filters.status"
        placeholder="状态"
        clearable
        class="filter-select"
        style="width: 120px"
      >
        <el-option label="全部" value="" />
        <el-option label="活跃" value="active" />
        <el-option label="已撤销" value="revoked" />
        <el-option label="已过期" value="expired" />
        <el-option label="已使用" value="used" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        format="YYYY/MM/DD"
        style="width: 260px"
      />
      <el-button type="primary" @click="handleFilter">执行筛选</el-button>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-cards">
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-shield">
          <el-icon :size="28"><Key /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">累计授权总量</div>
          <div class="kpi-value">{{ stats.total ?? '-' }}</div>
          <div class="kpi-change kpi-change-up" v-if="stats.newToday != null && stats.newToday > 0">
            +{{ stats.newToday }} 今日新增
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-active">
          <el-icon :size="28"><TrendCharts /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">当前活跃授权</div>
          <div class="kpi-value">{{ stats.activeCount ?? '-' }}</div>
          <div
            class="kpi-change kpi-change-up"
            v-if="stats.newActiveComparedYesterday != null && stats.newActiveComparedYesterday > 0"
          >
            +{{ stats.newActiveComparedYesterday }} 较昨日新增
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-user">
          <el-icon :size="28"><UserFilled /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">去重用户总数</div>
          <div class="kpi-value">{{ stats.uniqueUsersCount ?? '-' }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-lock">
          <el-icon :size="28"><Lock /></el-icon>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">实时冻结额度</div>
          <div class="kpi-value">{{ formatFrozen(stats.totalFrozenQuota) }}</div>
          <div class="kpi-unit">PTS</div>
        </div>
      </div>
    </div>

    <!-- 中部：状态构成 + 增长趋势 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <span>授权状态构成</span>
        </template>
        <div ref="chartDoughnutRef" class="chart-container"></div>
      </el-card>
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <span>授权增长趋势 (最近7天)</span>
        </template>
        <div ref="chartLineRef" class="chart-container"></div>
      </el-card>
    </div>

    <!-- 底部：模型热度 + 高频排行 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <span>模型热度分析</span>
        </template>
        <div ref="chartBarRef" class="chart-container"></div>
      </el-card>
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <span>高频授权排行 (Top 3)</span>
        </template>
        <div class="ranking-list">
          <div
            v-for="user in top3Users"
            :key="user.userId"
            class="ranking-item"
          >
            <div class="ranking-avatar" :style="{ backgroundColor: getAvatarColor(user.email || user.userId) }">
              {{ getAvatarText(user.email || user.phone || user.userId) }}
            </div>
            <div class="ranking-info">
              <div class="ranking-email">{{ user.email || user.phone || '未知用户' }}</div>
              <div class="ranking-id">{{ user.userId }}</div>
            </div>
            <div class="ranking-quota">
              <el-progress
                :percentage="user.quotaPercentage || 0"
                :stroke-width="8"
                :show-text="false"
              />
              <span class="quota-text">{{ user.quotaPercentage || 0 }}%</span>
            </div>
            <div class="ranking-count">数量 {{ user._count }}</div>
          </div>
          <div v-if="!(stats.userStats && stats.userStats.length)" class="empty-tip">暂无数据</div>
        </div>
        <router-link to="/authorization/list" class="view-more-link">查看更多排行数据 &gt;</router-link>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { Refresh, Key, TrendCharts, UserFilled, Lock, Monitor, User } from '@element-plus/icons-vue'
import { getAllUsersAuthorizationStats } from '@/api/authorization'

const loading = ref(false)
const chartDoughnutRef = ref(null)
const chartLineRef = ref(null)
const chartBarRef = ref(null)
let chartDoughnut = null
let chartLine = null
let chartBar = null

const STATUS_COLORS = {
  active: '#14b8a6',
  revoked: '#f59e0b',
  expired: '#8b5cf6',
  used: '#f43f5e'
}
const stats = ref({})
const filters = reactive({
  deviceFingerprint: '',
  userId: '',
  status: ''
})
const dateRange = ref([])

const statusLabels = {
  active: '活跃',
  revoked: '已撤销',
  expired: '已过期',
  used: '已使用'
}

const top3Users = computed(() => {
  const list = stats.value.userStats || []
  return list.slice(0, 3)
})

function formatFrozen(val) {
  if (val == null || val === '') return '-'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function getAvatarText(str) {
  if (!str) return '?'
  if (str.includes('@')) return str.substring(0, 1).toUpperCase()
  return str.substring(0, 2).toUpperCase()
}

function getAvatarColor(str) {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
  if (!str) return colors[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function buildParams() {
  const params = {}
  if (filters.deviceFingerprint) params.deviceFingerprint = filters.deviceFingerprint
  if (filters.userId) params.userId = filters.userId
  if (filters.status) params.status = filters.status
  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = dateRange.value[0] + 'T00:00:00.000Z'
    params.endDate = dateRange.value[1] + 'T23:59:59.999Z'
  }
  return params
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getAllUsersAuthorizationStats(buildParams())
    if (res.success) {
      stats.value = res.data || {}
    }
  } catch (e) {
    ElMessage.error('获取授权统计失败')
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  fetchData()
}

function initCharts() {
  if (chartDoughnutRef.value && !chartDoughnut) {
    chartDoughnut = echarts.init(chartDoughnutRef.value)
  }
  if (chartLineRef.value && !chartLine) {
    chartLine = echarts.init(chartLineRef.value)
  }
  if (chartBarRef.value && !chartBar) {
    chartBar = echarts.init(chartBarRef.value)
  }
  updateCharts()
}

function updateCharts() {
  const s = stats.value

  if (chartDoughnut && chartDoughnutRef.value) {
    const orderStatus = ['active', 'revoked', 'expired', 'used']
    const byStatus = Object.fromEntries(
      (s.statusStats || []).map(i => [i.status, i._count || 0])
    )
    const data = orderStatus.map(status => ({
      name: statusLabels[status] || status,
      value: byStatus[status] ?? 0,
      itemStyle: { color: STATUS_COLORS[status] || '#94a3b8' }
    }))
    const total = data.reduce((sum, d) => sum + d.value, 0)
    const activeRate = s.activeRate ?? 0
    const centerText = total === 0 ? '暂无数据' : activeRate > 0 ? `${activeRate}%` : String(total)
    const centerSubtext = total === 0 ? '' : activeRate > 0 ? '活跃率' : '总授权'
    chartDoughnut.setOption({
      title: {
        text: centerText,
        subtext: centerSubtext,
        left: 'center',
        top: 'center',
        textStyle: {
          fontSize: total === 0 ? 14 : 24,
          fontWeight: 700,
          color: total === 0 ? '#94a3b8' : '#0f172a'
        },
        subtextStyle: { fontSize: 12, color: '#64748b' },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 20,
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12, color: '#475569' },
        formatter: name => {
          const item = data.find(d => d.name === name)
          return `${name} ${item ? item.value : 0}`
        }
      },
      series: [{
        type: 'pie',
        radius: ['40%', '60%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: params => (params.percent >= 5 || params.value === 0 ? `${params.percent}%` : ''),
          fontSize: 11,
          color: '#0f172a'
        },
        labelLine: { show: true, length: 8, length2: 4 },
        minAngle: 10,
        data: total > 0 ? data : [{ name: '无数据', value: 1, itemStyle: { color: '#e2e8f0' } }],
        emphasis: { scale: true, scaleSize: 5 }
      }]
    })
  }

  if (chartLine && chartLineRef.value) {
    const trend = s.trendLast7Days || []
    const xData = trend.map(t => t.dayLabel || t.date || '')
    const yData = trend.map(t => t.count || 0)
    chartLine.setOption({
      tooltip: {
        trigger: 'item',
        formatter: params => `${params.name}<br/>授权数: ${params.value}`
      },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: xData, boundaryGap: false },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        name: '授权数',
        type: 'line',
        data: yData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2 },
        itemStyle: { color: 'var(--el-color-primary)' },
        areaStyle: { opacity: 0.1 },
        emphasis: {
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.1 }
        }
      }]
    })
  }

  if (chartBar && chartBarRef.value) {
    const modelList = [...(s.modelStats || [])]
    const yData = modelList.map(m => m.displayName || m.modelName || m.modelId || '')
    const xData = modelList.map(m => m._count || 0)
    chartBar.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 120, right: 50, top: 20, bottom: 20 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: { type: 'category', data: yData, axisLabel: { overflow: 'truncate', width: 100 } },
      series: [{
        type: 'bar',
        data: xData,
        barWidth: '60%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#60a5fa' }
          ])
        }
      }]
    })
  }
}

function resizeCharts() {
  chartDoughnut?.resize()
  chartLine?.resize()
  chartBar?.resize()
}

watch(stats, () => updateCharts(), { deep: true })

onMounted(async () => {
  await fetchData()
  await nextTick()
  initCharts()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  chartDoughnut?.dispose()
  chartLine?.dispose()
  chartBar?.dispose()
})
</script>

<style scoped>
.authorization-stats-page {
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

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.filter-input,
.filter-select {
  flex-shrink: 0;
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

.kpi-icon-shield {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.kpi-icon-active {
  background: linear-gradient(135deg, #10b981, #059669);
}

.kpi-icon-user {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.kpi-icon-lock {
  background: linear-gradient(135deg, #f59e0b, #d97706);
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

.kpi-unit {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
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

.chart-container {
  width: 100%;
  height: 280px;
  min-height: 200px;
}

.ranking-list {
  min-height: 160px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.ranking-item:last-of-type {
  border-bottom: none;
}

.ranking-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.ranking-info {
  flex: 1;
  min-width: 0;
}

.ranking-email {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.ranking-id {
  font-size: 12px;
  color: #94a3b8;
}

.ranking-quota {
  width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quota-text {
  font-size: 12px;
  color: #64748b;
  min-width: 32px;
}

.ranking-count {
  font-size: 13px;
  color: #64748b;
}

.view-more-link {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.view-more-link:hover {
  text-decoration: underline;
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
