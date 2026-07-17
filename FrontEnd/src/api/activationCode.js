import request from './request'

export function getActivationCodeMeta() {
  return request({
    url: '/activation-codes/meta',
    method: 'get'
  })
}

export function getActivationCodes(params) {
  return request({
    url: '/activation-codes',
    method: 'get',
    params
  })
}

export function getActivationCodeById(id) {
  return request({
    url: `/activation-codes/${id}`,
    method: 'get'
  })
}

export function createActivationCodes(data) {
  return request({
    url: '/activation-codes',
    method: 'post',
    data
  })
}

export function updateActivationCode(id, data) {
  return request({
    url: `/activation-codes/${id}`,
    method: 'put',
    data
  })
}

export function deleteActivationCode(id) {
  return request({
    url: `/activation-codes/${id}`,
    method: 'delete'
  })
}

export function destroyExpiredActivationCodes() {
  return request({
    url: '/activation-codes/destroy-expired',
    method: 'post'
  })
}
