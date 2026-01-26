import request from './request'

// 获取提供商列表
export function getProviders(params) {
  return request({
    url: '/providers',
    method: 'get',
    params
  })
}

// 获取提供商详情
export function getProviderById(id) {
  return request({
    url: `/providers/${id}`,
    method: 'get'
  })
}

// 创建提供商
export function createProvider(data) {
  return request({
    url: '/providers',
    method: 'post',
    data
  })
}

// 更新提供商
export function updateProvider(id, data) {
  return request({
    url: `/providers/${id}`,
    method: 'put',
    data
  })
}

// 删除提供商
export function deleteProvider(id) {
  return request({
    url: `/providers/${id}`,
    method: 'delete'
  })
}

// 更新提供商状态
export function updateProviderStatus(id, isActive) {
  return request({
    url: `/providers/${id}/status`,
    method: 'patch',
    data: { isActive }
  })
}

