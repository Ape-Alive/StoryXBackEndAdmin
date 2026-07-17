import request from './request'

export function getOtaReleaseMeta() {
  return request({
    url: '/ota/admin/meta',
    method: 'get'
  })
}

export function getOtaReleaseList(params) {
  return request({
    url: '/ota/admin/releases',
    method: 'get',
    params
  })
}

export function getOtaReleaseById(id) {
  return request({
    url: `/ota/admin/releases/${id}`,
    method: 'get'
  })
}

export function createOtaRelease(data) {
  return request({
    url: '/ota/admin/releases',
    method: 'post',
    data
  })
}

export function updateOtaRelease(id, data) {
  return request({
    url: `/ota/admin/releases/${id}`,
    method: 'put',
    data
  })
}

export function publishOtaRelease(id, data = {}) {
  return request({
    url: `/ota/admin/releases/${id}/publish`,
    method: 'post',
    data
  })
}

export function unpublishOtaRelease(id) {
  return request({
    url: `/ota/admin/releases/${id}/unpublish`,
    method: 'post'
  })
}

export function deleteOtaRelease(id) {
  return request({
    url: `/ota/admin/releases/${id}`,
    method: 'delete'
  })
}

export function uploadOtaArtifact(formData) {
  return request({
    url: '/ota/admin/releases/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function getOtaReports(params) {
  return request({
    url: '/ota/admin/reports',
    method: 'get',
    params
  })
}

export function checkOtaUpdates(data) {
  return request({
    url: '/ota/check',
    method: 'post',
    data
  })
}
