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

// 调整提供商关联API Key额度（总额度）
export function adjustProviderApiKeyCredits(providerId, apiKeyId, data) {
  return request({
    url: `/providers/${providerId}/api-keys/${apiKeyId}/credits`,
    method: 'patch',
    data
  })
}

/** 该 API Key 在「音色克隆」中关联的音色列表 */
export function getProviderApiKeyClonedVoices(providerId, apiKeyId, params) {
  return request({
    url: `/providers/${providerId}/api-keys/${apiKeyId}/cloned-voices`,
    method: 'get',
    params
  })
}

/** 解密系统级 API Key（仅超级/平台管理员），用于管理端上传等 */
export function revealProviderApiKeyToken(providerId, apiKeyId) {
  return request({
    url: `/providers/${providerId}/api-keys/${apiKeyId}/decrypted-token`,
    method: 'post'
  })
}
