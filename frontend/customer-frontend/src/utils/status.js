export const ORDER_STATUS_LABELS = {
  READY: '주문접수',
  CREATED: '주문접수',
  ORDERED: '주문접수',
  PENDING: '주문대기',
  PENDING_PAYMENT: '결제대기',
  PAYMENT_PENDING: '결제대기',
  PAID: '결제완료',
  PREPARING: '상품준비중',
  SHIPPING: '배송중',
  SHIPPED: '배송중',
  IN_TRANSIT: '배송중',
  DELIVERED: '배송완료',
  COMPLETED: '구매확정',
  CANCELLED: '주문취소',
  REFUNDED: '환불완료',
}

// order_items.item_status도 주문 상태와 같은 코드를 사용한다.
// 별도 이름을 두어 주문 전체 상태와 상품별 상태를 UI에서 명확히 구분한다.
export const ITEM_STATUS_LABELS = {
  ...ORDER_STATUS_LABELS,
}

export const REFUND_STATUS_LABELS = {
  REQUESTED: '환불접수',
  REVIEWING: '환불검토중',
  APPROVED: '환불승인',
  REJECTED: '환불거절',
  COMPLETED: '환불완료',
  CANCELLED: '환불취소',
}

export const RETURN_STATUS_LABELS = {
  REQUESTED: '반품접수',
  APPROVED: '반품승인',
  REJECTED: '반품거절',
  PICKUP_REQUESTED: '회수요청',
  PICKED_UP: '회수완료',
  RECEIVED: '입고완료',
  INSPECTING: '검수중',
  COMPLETED: '반품완료',
  CANCELLED: '반품취소',
}

export const INQUIRY_STATUS_LABELS = {
  RECEIVED: '접수완료',
  IN_PROGRESS: '처리중',
  ANSWERED: '답변완료',
  COMPLETED: '답변완료',
  CLOSED: '종료',
}

export function statusLabel(map, value) {
  return map[value] || value || '-'
}

export function orderStatusTone(status = '') {
  if (['COMPLETED', 'DELIVERED'].includes(status)) return 'success'
  if (['SHIPPING', 'SHIPPED', 'IN_TRANSIT'].includes(status)) return 'shipping'
  if (['PREPARING', 'PAID'].includes(status)) return 'progress'
  if (['CANCELLED', 'REFUNDED'].includes(status)) return 'danger'
  return 'neutral'
}
