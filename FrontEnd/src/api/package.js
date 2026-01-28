import request from './request'

// 获取套餐列表
export function getPackages(params) {
  return request({
    url: '/packages',
    method: 'get',
    params
  })
}

// 获取套餐详情
export function getPackageById(id) {
  return request({
    url: `/packages/${id}`,
    method: 'get'
  })
}

// 创建套餐
export function createPackage(data) {
  return request({
    url: '/packages',
    method: 'post',
    data
  })
}

// 更新套餐
export function updatePackage(id, data) {
  return request({
    url: `/packages/${id}`,
    method: 'put',
    data
  })
}

// 删除套餐
export function deletePackage(id) {
  return request({
    url: `/packages/${id}`,
    method: 'delete'
  })
}

// 复制套餐
export function duplicatePackage(id, data) {
  return request({
    url: `/packages/${id}/duplicate`,
    method: 'post',
    data
  })
}

// 更新套餐状态
export function updatePackageStatus(id, isActive) {
  return request({
    url: `/packages/${id}/status`,
    method: 'patch',
    data: { isActive }
  })
}

// 批量更新套餐状态
export function batchUpdatePackageStatus(data) {
  return request({
    url: '/packages/batch/status',
    method: 'patch',
    data
  })
}

// 批量删除套餐
export function batchDeletePackages(data) {
  return request({
    url: '/packages/batch',
    method: 'delete',
    data
  })
}


