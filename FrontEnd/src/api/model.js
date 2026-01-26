import request from './request'

// 获取模型列表
export function getModels(params) {
  return request({
    url: '/models',
    method: 'get',
    params
  })
}

// 获取模型详情
export function getModelById(id) {
  return request({
    url: `/models/${id}`,
    method: 'get'
  })
}

// 创建模型
export function createModel(data) {
  return request({
    url: '/models',
    method: 'post',
    data
  })
}

// 更新模型
export function updateModel(id, data) {
  return request({
    url: `/models/${id}`,
    method: 'put',
    data
  })
}

// 删除模型
export function deleteModel(id) {
  return request({
    url: `/models/${id}`,
    method: 'delete'
  })
}

// 更新模型状态
export function updateModelStatus(id, isActive) {
  return request({
    url: `/models/${id}/status`,
    method: 'patch',
    data: { isActive }
  })
}

// 批量更新模型状态
export function batchUpdateModelStatus(ids, isActive) {
  return request({
    url: '/models/batch/status',
    method: 'patch',
    data: { ids, isActive }
  })
}

// 批量删除模型
export function batchDeleteModels(ids) {
  return request({
    url: '/models/batch',
    method: 'delete',
    data: { ids }
  })
}

// 获取模型价格列表
export function getModelPrices(modelId, params) {
  return request({
    url: `/models/${modelId}/prices`,
    method: 'get',
    params
  })
}

// 创建模型价格
export function createModelPrice(modelId, data) {
  return request({
    url: `/models/${modelId}/prices`,
    method: 'post',
    data
  })
}

// 更新模型价格
export function updateModelPrice(modelId, priceId, data) {
  return request({
    url: `/models/${modelId}/prices/${priceId}`,
    method: 'put',
    data
  })
}

