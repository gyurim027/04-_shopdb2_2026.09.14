export const ACTIVE_REFUND_STATUSES = new Set([
  'REQUESTED',
  'REVIEWING',
  'APPROVED',
  'COMPLETED',
])

export const ACTIVE_RETURN_STATUSES = new Set([
  'REQUESTED',
  'APPROVED',
  'PICKUP_REQUESTED',
  'PICKED_UP',
  'RECEIVED',
  'INSPECTING',
  'COMPLETED',
])

export function buildLinkedRefundIds(returnDetails = []) {
  return new Set(
    returnDetails
      .map((item) => Number(item?.refund_request_id))
      .filter((id) => Number.isFinite(id) && id > 0),
  )
}

export function buildClaimedQuantityMap(refundDetails = [], returnDetails = []) {
  const linkedRefundIds = buildLinkedRefundIds(returnDetails)
  const claimed = {}

  refundDetails.forEach((request) => {
    if (!ACTIVE_REFUND_STATUSES.has(request?.refund_status)) return
    if (linkedRefundIds.has(Number(request?.refund_request_id))) return

    ;(request?.items || []).forEach((item) => {
      const orderItemId = Number(item?.order_item_id)
      const quantity = Number(item?.refund_quantity || 0)
      if (!Number.isFinite(orderItemId) || orderItemId <= 0 || quantity <= 0) return
      claimed[orderItemId] = Number(claimed[orderItemId] || 0) + quantity
    })
  })

  returnDetails.forEach((request) => {
    if (!ACTIVE_RETURN_STATUSES.has(request?.return_status)) return

    ;(request?.items || []).forEach((item) => {
      const orderItemId = Number(item?.order_item_id)
      const quantity = Number(item?.return_quantity || 0)
      if (!Number.isFinite(orderItemId) || orderItemId <= 0 || quantity <= 0) return
      claimed[orderItemId] = Number(claimed[orderItemId] || 0) + quantity
    })
  })

  return claimed
}

export function getRemainingQuantity(orderItem, claimedQuantityMap = {}) {
  const ordered = Number(orderItem?.quantity ?? orderItem?.ordered_quantity ?? 0)
  const claimed = Number(claimedQuantityMap[Number(orderItem?.order_item_id)] || 0)
  return Math.max(0, ordered - claimed)
}

export function hasRemainingItems(order, claimedQuantityMap = {}) {
  return (order?.items || []).some((item) => getRemainingQuantity(item, claimedQuantityMap) > 0)
}

export function refundRequestHeadline(status) {
  if (status === 'COMPLETED') return '환불완료'
  if (status === 'REJECTED') return '환불거절'
  if (status === 'CANCELLED') return '환불취소'
  return '환불신청'
}

export function returnRequestHeadline(status) {
  if (status === 'COMPLETED') return '반품완료'
  if (status === 'REJECTED') return '반품거절'
  if (status === 'CANCELLED') return '반품취소'
  return '반품신청'
}
