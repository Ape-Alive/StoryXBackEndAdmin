import request from './request'

// 获取设备列表（管理员）
export function getDevices(params) {
  return request({
    url: '/devices',
    method: 'get',
    params
  })
}

// 获取设备详情（管理员）
export function getDeviceById(id) {
  return request({
    url: `/devices/${id}`,
    method: 'get'
  })
}

// 更新设备信息（管理员）
export function updateDevice(id, data) {
  return request({
    url: `/devices/${id}`,
    method: 'patch',
    data
  })
}

// 强制解绑设备（管理员）
export function revokeDevice(id) {
  return request({
    url: `/devices/${id}/revoke`,
    method: 'post'
  })
}

// 恢复设备（管理员）
export function allowDevice(id) {
  return request({
    url: `/devices/${id}/allow`,
    method: 'post'
  })
}

// 批量更新设备状态（管理员）
export function batchUpdateDeviceStatus(data) {
  return request({
    url: '/devices/batch/status',
    method: 'patch',
    data
  })
}

// 批量删除设备（管理员）
export function batchDeleteDevices(data) {
  return request({
    url: '/devices/batch',
    method: 'delete',
    data
  })
}
