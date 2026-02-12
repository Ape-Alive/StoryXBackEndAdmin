import request from './request'

/**
 * 获取授权记录列表
 */
export function getAuthorizations(params) {
  return request({
    url: '/authorization',
    method: 'get',
    params
  })
}

/**
 * 获取授权记录详情
 */
export function getAuthorizationDetail(id) {
  return request({
    url: `/authorization/${id}`,
    method: 'get'
  })
}

/**
 * 撤销授权
 */
export function revokeAuthorization(id) {
  return request({
    url: `/authorization/${id}`,
    method: 'delete'
  })
}

/**
 * 根据 callToken 获取授权记录
 */
export function getAuthorizationByCallToken(callToken) {
  return request({
    url: `/authorization/call-token/${callToken}`,
    method: 'get'
  })
}

/**
 * 获取用户授权统计
 */
export function getUserAuthorizationStats(userId) {
  return request({
    url: `/authorization/users/${userId}/stats`,
    method: 'get'
  })
}

/**
 * 获取全部用户的授权统计（看板，支持筛选）
 * @param {Object} params - 可选: deviceFingerprint, userId, status, startDate, endDate
 */
export function getAllUsersAuthorizationStats(params = {}) {
  return request({
    url: '/authorization/stats',
    method: 'get',
    params
  })
}
