import request from './request'

// 获取用户套餐列表（管理员）
export function getUserPackages(params) {
  return request({
    url: '/packages/user-packages/list',
    method: 'get',
    params
  })
}

// 获取用户套餐详情（管理员）
export function getUserPackageById(id) {
  return request({
    url: `/packages/user-packages/${id}`,
    method: 'get'
  })
}

// 分配套餐给用户（管理员）
export function assignPackageToUser(data) {
  return request({
    url: '/packages/user-packages/assign',
    method: 'post',
    data
  })
}

// 取消用户套餐（管理员）
export function cancelUserPackage(id) {
  return request({
    url: `/packages/user-packages/${id}`,
    method: 'delete'
  })
}

// 更新用户套餐优先级（管理员）
export function updateUserPackagePriority(id, data) {
  return request({
    url: `/packages/user-packages/${id}/priority`,
    method: 'patch',
    data
  })
}

// 延期用户套餐（管理员）
export function extendUserPackage(id, data) {
  return request({
    url: `/packages/user-packages/${id}/extend`,
    method: 'patch',
    data
  })
}

// 获取用户的活跃套餐列表（管理员）
export function getUserActivePackages(userId) {
  return request({
    url: `/packages/users/${userId}/active-packages`,
    method: 'get'
  })
}
