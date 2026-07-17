import request from './request'

export function getStyleLibraryMeta() {
  return request({
    url: '/style-library/meta',
    method: 'get'
  })
}

export function getStyleLibraryList(params) {
  return request({
    url: '/style-library',
    method: 'get',
    params
  })
}

export function getStyleLibraryById(id) {
  return request({
    url: `/style-library/${id}`,
    method: 'get'
  })
}

export function createStyleLibraryItem(data) {
  return request({
    url: '/style-library',
    method: 'post',
    data
  })
}

export function updateStyleLibraryItem(id, data) {
  return request({
    url: `/style-library/${id}`,
    method: 'put',
    data
  })
}

export function deleteStyleLibraryItem(id, params) {
  return request({
    url: `/style-library/${id}`,
    method: 'delete',
    params
  })
}
