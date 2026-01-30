import request from './request'

// 获取额度流水列表
export function getQuotaRecords(params) {
  return request({ url: '/quota-records', method: 'get', params })
}

// 获取额度流水详情
export function getQuotaRecordDetail(id) {
  return request({ url: `/quota-records/${id}`, method: 'get' })
}

// 删除额度流水记录
export function deleteQuotaRecord(id) {
  return request({ url: `/quota-records/${id}`, method: 'delete' })
}

// 根据 requestId 查询流水
export function getQuotaRecordsByRequestId(requestId) {
  return request({ url: `/quota-records/request/${requestId}`, method: 'get' })
}

// 导出额度流水
export function exportQuotaRecords(data) {
  return request({ url: '/quota-records/export', method: 'post', data })
}

// 批量删除额度流水记录
export function batchDeleteQuotaRecords(data) {
  return request({ url: '/quota-records/batch', method: 'delete', data })
}
