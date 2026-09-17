import { apiRequest } from './apiClient'

// 로그인한 셀러의 상품이 포함된 주문 목록을 불러옵니다.
export async function getSellerOrders() {
  return apiRequest('/seller/orders')
}

// 특정 주문의 셀러 상품과 배송 정보를 불러옵니다.
export async function getSellerOrderDetail(orderId) {
  return apiRequest(`/seller/orders/${orderId}`)
}

// 주문의 결제 정보를 불러옵니다.
export async function getSellerOrderPayment(orderId) {
  return apiRequest(`/seller/orders/${orderId}/payment`)
}

// 주문의 영수증 정보를 불러옵니다.
export async function getSellerOrderReceipt(orderId) {
  return apiRequest(`/seller/orders/${orderId}/receipt`)
}

// 주문 상품의 처리 상태를 변경합니다.
export async function updateSellerOrderItemStatus(orderItemId, itemStatus) {
  return apiRequest(`/seller/orders/items/${orderItemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      item_status: itemStatus,
    }),
  })
}