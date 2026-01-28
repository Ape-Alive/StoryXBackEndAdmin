import request from './request'

// 获取管理员列表
export function getAdmins(params) {
  return request({
    url: '/admins',
    method: 'get',
    params
  })
}

// 获取管理员详情
export function getAdminById(id) {
  return request({
    url: `/admins/${id}`,
    method: 'get'
  })
}

// 创建管理员
export function createAdmin(data) {
  return request({
    url: '/admins',
    method: 'post',
    data
  })
}

// 更新管理员
export function updateAdmin(id, data) {
  return request({
    url: `/admins/${id}`,
    method: 'put',
    data
  })
}

// 删除管理员
export function deleteAdmin(id) {
  return request({
    url: `/admins/${id}`,
    method: 'delete'
  })
}

// 更新管理员状态
export function updateAdminStatus(id, status) {
  return request({
    url: `/admins/${id}/status`,
    method: 'patch',
    data: { status }
  })
}

// 更新管理员角色
export function updateAdminRole(id, role) {
  return request({
    url: `/admins/${id}/role`,
    method: 'patch',
    data: { role }
  })
}

// 批量更新管理员状态
export function batchUpdateAdminStatus(ids, status) {
  return request({
    url: '/admins/batch/status',
    method: 'patch',
    data: { ids, status }
  })
}

// 批量删除管理员
export function batchDeleteAdmins(ids) {
  return request({
    url: '/admins/batch',
    method: 'delete',
    data: { ids }
  })
}

// 导出管理员数据
export function exportAdmins(params) {
  return request({
    url: '/admins/export',
    method: 'post',
    data: params
  })
}

