import request from './request'

/**
 * 获取大盘汇总指标
 */
export function getSummaryMetrics() {
  return request({
    url: '/dashboard/summary-metrics',
    method: 'get'
  })
}

/**
 * 获取调用与积分趋势
 * @param {string} timeRange - 24h, 7d, 30d
 */
export function getCallPointsTrend(timeRange = '24h') {
  return request({
    url: '/dashboard/call-points-trend',
    method: 'get',
    params: { timeRange }
  })
}

/**
 * 获取模型负载占比
 */
export function getModelLoadRatio() {
  return request({
    url: '/dashboard/model-load-ratio',
    method: 'get'
  })
}

/**
 * 获取提供商健康度
 */
export function getModelProviderHealth() {
  return request({
    url: '/dashboard/model-provider-health',
    method: 'get'
  })
}

/**
 * 获取最近风控触发记录
 * @param {number} limit - 1-20
 */
export function getRealtimeRiskTriggers(limit = 5) {
  return request({
    url: '/dashboard/realtime-risk-triggers',
    method: 'get',
    params: { limit }
  })
}
