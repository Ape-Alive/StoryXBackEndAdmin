import request from './request'

export function getClientMenuMeta() {
  return request({ url: '/client-menus/meta', method: 'get' })
}

export function getClientMenuTree(params) {
  return request({ url: '/client-menus/tree', method: 'get', params })
}

export function getClientMenuById(id) {
  return request({ url: `/client-menus/${id}`, method: 'get' })
}

export function createClientMenu(data) {
  return request({ url: '/client-menus', method: 'post', data })
}

export function updateClientMenu(id, data) {
  return request({ url: `/client-menus/${id}`, method: 'put', data })
}

export function deleteClientMenu(id) {
  return request({ url: `/client-menus/${id}`, method: 'delete' })
}

export function getClientMenuButtons(menuId) {
  return request({ url: `/client-menus/${menuId}/buttons`, method: 'get' })
}

export function createClientMenuButton(menuId, data) {
  return request({ url: `/client-menus/${menuId}/buttons`, method: 'post', data })
}

export function updateClientMenuButton(menuId, buttonId, data) {
  return request({ url: `/client-menus/${menuId}/buttons/${buttonId}`, method: 'put', data })
}

export function deleteClientMenuButton(menuId, buttonId) {
  return request({ url: `/client-menus/${menuId}/buttons/${buttonId}`, method: 'delete' })
}
