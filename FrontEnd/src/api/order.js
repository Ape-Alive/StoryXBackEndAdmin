import request from './request'

// 管理员查询订单列表
export function getOrders(params) {
  return request({ url: '/orders', method: 'get', params })
}

// 管理员查询订单详情
export function getOrderDetail(id) {
  return request({ url: `/orders/${id}`, method: 'get' })
}
