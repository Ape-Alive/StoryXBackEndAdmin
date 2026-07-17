import request from './request'

export function getBackendRoles() {
  return request({ url: '/backend-roles', method: 'get' })
}

export function getAssignableBackendRoles() {
  return request({ url: '/backend-roles/options', method: 'get' })
}

export function createBackendRole(data) {
  return request({ url: '/backend-roles', method: 'post', data })
}

export function deleteBackendRole(id) {
  return request({ url: `/backend-roles/${id}`, method: 'delete' })
}

export function getBackendRoleById(id) {
  return request({ url: `/backend-roles/${id}`, method: 'get' })
}

export function updateBackendRole(id, data) {
  return request({ url: `/backend-roles/${id}`, method: 'put', data })
}

export function getBackendRolePermissions(id) {
  return request({ url: `/backend-roles/${id}/permissions`, method: 'get' })
}

export function saveBackendRolePermissions(id, data) {
  return request({ url: `/backend-roles/${id}/permissions`, method: 'put', data })
}
