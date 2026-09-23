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

export function getEffectiveReturnStatus(request = {}) {
  const rawStatus = request?.return_status || ''

  if (['REJECTED', 'CANCELLED'].includes(rawStatus)) return rawStatus
  if (request?.completed_at) return 'COMPLETED'

  const rank = {
    REQUESTED: 1,
    APPROVED: 2,
    PICKUP_REQUESTED: 3,
    PICKED_UP: 3,
    RECEIVED: 4,
    INSPECTING: 5,
    COMPLETED: 6,
  }

  let inferredStatus = rawStatus || 'REQUESTED'
  let inferredRank = rank[inferredStatus] || 0

  const promote = (status, condition) => {
    if (!condition) return
    const nextRank = rank[status] || 0
    if (nextRank > inferredRank) {
      inferredStatus = status
      inferredRank = nextRank
    }
  }

  promote('PICKED_UP', request?.pickup_at)
  promote('RECEIVED', request?.received_at)
  promote('INSPECTING', request?.inspected_at)

  return inferredStatus
}

export function returnRequestHeadline(status) {
  const labels = {
    REQUESTED: '반품신청',
    APPROVED: '반품승인',
    PICKUP_REQUESTED: '회수요청',
    PICKED_UP: '회수완료',
    RECEIVED: '입고완료',
    INSPECTING: '상품검수',
    COMPLETED: '반품완료',
    REJECTED: '반품거절',
    CANCELLED: '반품취소',
  }
  return labels[status] || '반품신청'
}
