export const ORDER_STATUS_LABELS = {
  CREATED: '주문접수',
  PENDING: '주문대기',
  PAID: '결제완료',
  PREPARING: '상품준비중',
  SHIPPING: '배송중',
  SHIPPED: '배송중',
  DELIVERED: '배송완료',
  COMPLETED: '구매완료',
  CANCELLED: '주문취소',
  REFUNDED: '환불완료',
}

export const REFUND_STATUS_LABELS = {
  REQUESTED: '환불접수',
  APPROVED: '환불승인',
  REJECTED: '환불거절',
  COMPLETED: '환불완료',
  CANCELLED: '환불취소',
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
