import request from './request'

// 获取提供商的API Key列表
export function getProviderApiKeys(providerId, params) {
  return request({
    url: `/providers/${providerId}/api-keys`,
    method: 'get',
    params
  })
}

// 为提供商添加关联API Key
export function addProviderApiKey(providerId, data) {
  return request({
    url: `/providers/${providerId}/api-keys`,
    method: 'post',
    data
  })
}

// 删除提供商的关联API Key
export function deleteProviderApiKey(providerId, apiKeyId) {
  return request({
    url: `/providers/${providerId}/api-keys/${apiKeyId}`,
    method: 'delete'
  })
}
