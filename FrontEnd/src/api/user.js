import request from './request'

// 获取终端用户列表
export function getUsers(params) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

// 获取终端用户详情
export function getUserById(id) {
  return request({
    url: `/users/${id}`,
    method: 'get'
  })
}

// 更新终端用户信息
export function updateUser(id, data) {
  return request({
    url: `/users/${id}`,
    method: 'put',
    data
  })
}

// 更新终端用户状态
export function updateUserStatus(id, data) {
  return request({
    url: `/users/${id}/status`,
    method: 'patch',
    data
  })
}

// 批量更新终端用户状态
export function batchUpdateUserStatus(data) {
  return request({
    url: '/users/batch/status',
    method: 'patch',
    data
  })
}

// 强制解绑单个设备
export function unbindUserDevice(userId, data) {
  return request({
    url: `/users/${userId}/devices`,
    method: 'delete',
    data
  })
}

// 批量解绑设备
export function batchUnbindUserDevices(userId, data) {
  return request({
    url: `/users/${userId}/devices/batch`,
    method: 'delete',
    data
  })
}

// 批量删除用户
export function batchDeleteUsers(data) {
  return request({
    url: '/users/batch',
    method: 'delete',
    data
  })
}

// 导出用户数据
export function exportUsers(data) {
  return request({
    url: '/users/export',
    method: 'post',
    data
  })
}


