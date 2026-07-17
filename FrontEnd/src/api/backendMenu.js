import request from './request'

export function getBackendMenuMeta() {
  return request({ url: '/backend-menus/meta', method: 'get' })
}

export function getBackendMenuTree(params) {
  return request({ url: '/backend-menus/tree', method: 'get', params })
}

export function getBackendMenuById(id) {
  return request({ url: `/backend-menus/${id}`, method: 'get' })
}

export function createBackendMenu(data) {
  return request({ url: '/backend-menus', method: 'post', data })
}

export function updateBackendMenu(id, data) {
  return request({ url: `/backend-menus/${id}`, method: 'put', data })
}

export function deleteBackendMenu(id) {
  return request({ url: `/backend-menus/${id}`, method: 'delete' })
}

export function getBackendMenuButtons(menuId) {
  return request({ url: `/backend-menus/${menuId}/buttons`, method: 'get' })
}

export function createBackendMenuButton(menuId, data) {
  return request({ url: `/backend-menus/${menuId}/buttons`, method: 'post', data })
}

export function updateBackendMenuButton(menuId, buttonId, data) {
  return request({ url: `/backend-menus/${menuId}/buttons/${buttonId}`, method: 'put', data })
}

export function deleteBackendMenuButton(menuId, buttonId) {
  return request({ url: `/backend-menus/${menuId}/buttons/${buttonId}`, method: 'delete' })
}
