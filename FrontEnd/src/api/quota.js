import request from './request'

// 获取额度列表
export function getQuotas(params) {
    return request({ url: '/quotas', method: 'get', params })
}

// 获取用户的所有额度
export function getUserQuotas(userId) {
    return request({ url: `/quotas/users/${userId}`, method: 'get' })
}

// 获取用户额度详情
export function getUserQuotaDetail(userId, packageId) {
    return request({
        url: `/quotas/users/${userId}/detail`,
        method: 'get',
        params: packageId ? { packageId } : {}
    })
}

// 手动调整额度
export function adjustQuota(userId, data) {
    return request({ url: `/quotas/users/${userId}/adjust`, method: 'patch', data })
}

// 冻结额度
export function freezeQuota(id, data) {
    return request({ url: `/quotas/${id}/freeze`, method: 'patch', data })
}

// 解冻额度
export function unfreezeQuota(id, data) {
    return request({ url: `/quotas/${id}/unfreeze`, method: 'patch', data })
}

// 设置额度
export function setQuota(id, data) {
    return request({ url: `/quotas/${id}`, method: 'put', data })
}

// 重置额度
export function resetQuota(id, data) {
    return request({ url: `/quotas/${id}/reset`, method: 'post', data })
}

// 批量调整额度
export function batchAdjustQuota(data) {
    return request({ url: '/quotas/batch/adjust', method: 'patch', data })
}

// 批量冻结额度
export function batchFreezeQuota(data) {
    return request({ url: '/quotas/batch/freeze', method: 'patch', data })
}

// 批量解冻额度
export function batchUnfreezeQuota(data) {
    return request({ url: '/quotas/batch/unfreeze', method: 'patch', data })
}

// 获取额度统计信息
export function getQuotaStatistics(params) {
    return request({ url: '/quotas/statistics', method: 'get', params })
}

// 导出额度数据
export function exportQuotas(data) {
    return request({ url: '/quotas/export', method: 'post', data })
}
