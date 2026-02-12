import request from './request'

/**
 * 获取 AI 调用日志列表
 * @param {Object} params - 筛选参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.userId - 用户ID筛选
 * @param {string} params.modelId - 模型ID筛选
 * @param {string} params.status - 调用状态 success|failure
 * @param {string} params.requestId - 请求ID
 * @param {string} params.startDate - 开始日期 ISO 8601
 * @param {string} params.endDate - 结束日期 ISO 8601
 */
export function getAICallLogs(params) {
  return request({
    url: '/logs/ai',
    method: 'get',
    params
  })
}

/**
 * 获取 AI 调用日志详情
 * @param {string} requestId - 请求ID
 */
export function getAICallLogDetail(requestId) {
  return request({
    url: `/logs/ai/${requestId}`,
    method: 'get'
  })
}

/**
 * 获取管理员操作日志列表
 * @param {Object} params - 筛选参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量（最大100）
 * @param {string} params.adminId - 管理员ID筛选
 * @param {string} params.action - 操作类型（CREATE/UPDATE/DELETE/UPDATE_STATUS等）
 * @param {string} params.targetType - 目标类型（user/model/package等）
 * @param {string} params.targetId - 目标ID
 * @param {string} params.result - 操作结果 success|failure
 * @param {string} params.startDate - 开始日期 ISO 8601
 * @param {string} params.endDate - 结束日期 ISO 8601
 */
export function getOperationLogs(params) {
  return request({
    url: '/logs/operation',
    method: 'get',
    params
  })
}

/**
 * 获取操作日志详情
 * @param {string} id - 日志ID
 */
export function getOperationLogDetail(id) {
  return request({
    url: `/logs/operation/${id}`,
    method: 'get'
  })
}
