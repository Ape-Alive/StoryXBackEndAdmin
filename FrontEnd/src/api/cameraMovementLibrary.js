import request from './request'

export function getCameraMovementLibraryMeta() {
  return request({
    url: '/camera-movement-library/meta',
    method: 'get'
  })
}

export function getCameraMovementLibraryList(params) {
  return request({
    url: '/camera-movement-library',
    method: 'get',
    params
  })
}

export function getCameraMovementLibraryById(id) {
  return request({
    url: `/camera-movement-library/${id}`,
    method: 'get'
  })
}

export function createCameraMovementLibraryItem(data) {
  return request({
    url: '/camera-movement-library',
    method: 'post',
    data
  })
}

export function updateCameraMovementLibraryItem(id, data) {
  return request({
    url: `/camera-movement-library/${id}`,
    method: 'put',
    data
  })
}

export function deleteCameraMovementLibraryItem(id, params) {
  return request({
    url: `/camera-movement-library/${id}`,
    method: 'delete',
    params
  })
}
