import { apiRequest } from './apiClient'

// 로그인한 셀러에게 접수된 반품 요청 목록을 불러옵니다.
// page와 size는 페이지 구분에 사용하고,
// returnStatus와 keyword는 상태 필터와 검색에 사용합니다.
export async function getSellerReturns({
  page = 1,
  size = 20,
  returnStatus = '',
  keyword = '',
} = {}) {
  const query = new URLSearchParams()

  query.set('page', String(page))
  query.set('size', String(size))

  if (returnStatus) {
    query.set('return_status', returnStatus)
  }

  if (keyword.trim()) {
    query.set('keyword', keyword.trim())
  }

  return apiRequest(
    `/seller/returns/requests?${query.toString()}`,
  )
}

// 특정 반품 요청과 그 안에 포함된 반품 상품을 조회합니다.
export async function getSellerReturnDetail(returnRequestId) {
  return apiRequest(
    `/seller/returns/requests/${returnRequestId}`,
  )
}

// 택배사, 운송장 번호와 상품 회수 진행 상태를 저장합니다.
export async function updateSellerReturnPickup(
  returnRequestId,
  {
    returnStatus,
    carrierName = '',
    trackingNo = '',
  },
) {
  return apiRequest(
    `/seller/returns/requests/${returnRequestId}/pickup`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        return_status: returnStatus,
        carrier_name: carrierName.trim() || null,
        tracking_no: trackingNo.trim() || null,
      }),
    },
  )
}

// 반품 상품 한 건의 상품 상태와 검수 결과를 저장합니다.
export async function updateSellerReturnInspection(
  returnItemId,
  {
    itemCondition,
    inspectionResult,
    inspectionNote = '',
  },
) {
  return apiRequest(
    `/seller/returns/items/${returnItemId}/inspection`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        item_condition: itemCondition.trim(),
        inspection_result: inspectionResult,
        inspection_note: inspectionNote.trim() || null,
      }),
    },
  )
}

// 모든 상품 검수 후 셀러가 반품을 승인하거나 반려합니다.
// 승인되면 이후 관리자에게 최종 처리를 인계합니다.
export async function decideSellerReturn(
  returnRequestId,
  decision,
) {
  return apiRequest(
    `/seller/returns/requests/${returnRequestId}/decision`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        decision,
      }),
    },
  )
}