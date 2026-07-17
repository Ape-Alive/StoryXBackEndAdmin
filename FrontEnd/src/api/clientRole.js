import request from './request'

export function getClientRoles() {
  return request({ url: '/client-roles', method: 'get' })
}

export function createClientRole(data) {
  return request({ url: '/client-roles', method: 'post', data })
}

export function deleteClientRole(id) {
  return request({ url: `/client-roles/${id}`, method: 'delete' })
}

export function getClientRoleById(id) {
  return request({ url: `/client-roles/${id}`, method: 'get' })
}

export function updateClientRole(id, data) {
  return request({ url: `/client-roles/${id}`, method: 'put', data })
}

export function getClientRolePermissions(id) {
  return request({ url: `/client-roles/${id}/permissions`, method: 'get' })
}

export function saveClientRolePermissions(id, data) {
  return request({ url: `/client-roles/${id}/permissions`, method: 'put', data })
}
