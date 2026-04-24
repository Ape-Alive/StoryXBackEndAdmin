import request from './request'

export function getVoiceProfiles(params) {
  return request({
    url: '/voice-profiles',
    method: 'get',
    params
  })
}

export function getVoiceProfileById(id) {
  return request({
    url: `/voice-profiles/${id}`,
    method: 'get'
  })
}

export function createVoiceProfile(data) {
  return request({
    url: '/voice-profiles',
    method: 'post',
    data
  })
}

export function updateVoiceProfile(id, data) {
  return request({
    url: `/voice-profiles/${id}`,
    method: 'put',
    data
  })
}

export function deleteVoiceProfile(id) {
  return request({
    url: `/voice-profiles/${id}`,
    method: 'delete'
  })
}

export function cloneVoiceProfile(data) {
  return request({
    url: '/voice-profiles/clone',
    method: 'post',
    data
  })
}

