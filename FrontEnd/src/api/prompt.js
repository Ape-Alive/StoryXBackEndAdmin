import request from './request'

// 获取提示词列表
export function getPrompts(params) {
  return request({
    url: '/prompts',
    method: 'get',
    params
  })
}

// 获取提示词详情
export function getPromptById(id) {
  return request({
    url: `/prompts/${id}`,
    method: 'get'
  })
}

// 创建提示词
export function createPrompt(data) {
  return request({
    url: '/prompts',
    method: 'post',
    data
  })
}

// 更新提示词
export function updatePrompt(id, data) {
  return request({
    url: `/prompts/${id}`,
    method: 'put',
    data
  })
}

// 删除提示词
export function deletePrompt(id) {
  return request({
    url: `/prompts/${id}`,
    method: 'delete'
  })
}

// 获取提示词版本列表
export function getPromptVersions(id) {
  return request({
    url: `/prompts/${id}/versions`,
    method: 'get'
  })
}

// 回滚提示词到指定版本
export function rollbackPrompt(id, data) {
  return request({
    url: `/prompts/${id}/rollback`,
    method: 'post',
    data
  })
}

// 获取提示词分类列表
export function getPromptCategories(params) {
  return request({
    url: '/prompts/categories',
    method: 'get',
    params
  })
}

// 创建提示词分类
export function createPromptCategory(data) {
  return request({
    url: '/prompts/categories',
    method: 'post',
    data
  })
}

// 更新提示词分类
export function updatePromptCategory(id, data) {
  return request({
    url: `/prompts/categories/${id}`,
    method: 'put',
    data
  })
}

// 删除提示词分类
export function deletePromptCategory(id) {
  return request({
    url: `/prompts/categories/${id}`,
    method: 'delete'
  })
}
