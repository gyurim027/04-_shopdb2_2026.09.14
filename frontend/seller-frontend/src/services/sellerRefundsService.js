import { apiRequest } from './apiClient'

// 로그인한 셀러 상품에 접수된 환불 요청을 불러옵니다.
export async function getSellerRefunds(refundStatus = '') {
  const query = new URLSearchParams()

  if (refundStatus) {
    query.set('refund_status', refundStatus)
  }

  const queryString = query.toString()
  const path = queryString
    ? `/seller/refunds/requests?${queryString}`
    : '/seller/refunds/requests'

  return apiRequest(path)
}

// 특정 환불 요청의 셀러 상품 상세를 불러옵니다.
export async function getSellerRefundDetail(refundRequestId) {
  return apiRequest(
    `/seller/refunds/requests/${refundRequestId}`,
  )
}