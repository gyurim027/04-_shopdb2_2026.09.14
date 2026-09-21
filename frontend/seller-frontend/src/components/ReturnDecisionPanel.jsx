import { useState } from 'react'

import { decideSellerReturn } from '../services/sellerReturnsService'

function ReturnDecisionPanel({
  returnRequest,
  onUpdated,
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const items = returnRequest.items ?? []

  const pendingCount = items.filter(
    (item) => item.inspection_result === 'PENDING',
  ).length

  const rejectedItems = items.filter(
    (item) => item.inspection_result === 'REJECTED',
  )

  // 검수 중 상태이고 모든 상품의 검수가 끝난 경우에만
  // 셀러의 최종 결정 영역을 표시합니다.
  if (
    returnRequest.return_status !== 'INSPECTING' ||
    pendingCount > 0
  ) {
    return null
  }

  const hasRejectedItem = rejectedItems.length > 0

  async function handleDecision(decision) {
    setErrorMessage('')

    const isApproved = decision === 'APPROVED'

    const confirmMessage = isApproved
      ? '반품을 승인하시겠습니까?\n\n승인 후 관리자에게 최종 반품 처리가 요청됩니다.'
      : '반품 요청을 반려하시겠습니까?\n\n저장된 상품별 검수 의견이 반려 근거로 사용됩니다.'

    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsSaving(true)

    try {
      const updatedReturn = await decideSellerReturn(
        returnRequest.return_request_id,
        decision,
      )

      onUpdated(
        updatedReturn,
        isApproved
          ? '반품을 승인했습니다. 관리자에게 최종 처리를 요청했습니다.'
          : '반품 요청을 반려했습니다.',
      )
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="return-decision-panel">

      {errorMessage && (
        <div className="return-decision-error" role="alert">
          {errorMessage}
        </div>
      )}

      {hasRejectedItem ? (
        <div className="return-decision-summary is-rejected">
          <strong>
            반려 검수 결과가 {rejectedItems.length}건 있습니다.
          </strong>

          <span>
            반려 상품이 포함되어 있으므로 전체 반품을 승인할 수
            없습니다. 검수 결과를 수정하거나 반품 요청을
            반려해 주세요.
          </span>
        </div>
      ) : (
        <div className="return-decision-summary is-approved">
          <strong>모든 상품이 반품 승인 가능한 상태입니다.</strong>

          <span>
            셀러가 승인하면 관리자에게 최종 반품 처리 대상으로
            전달됩니다.
          </span>
        </div>
      )}

      <div className="return-decision-actions">
        <span>
          최종 처리 후에는 셀러 화면에서 다시 변경할 수 없습니다.
        </span>

        <div>
          {hasRejectedItem && (
            <button
              className="return-reject-button"
              type="button"
              disabled={isSaving}
              onClick={() => handleDecision('REJECTED')}
            >
              {isSaving ? '처리 중' : '반품 반려'}
            </button>
          )}

          {!hasRejectedItem && (
            <button
              className="return-approve-button"
              type="button"
              disabled={isSaving}
              onClick={() => handleDecision('APPROVED')}
            >
              {isSaving ? '처리 중' : '반품 승인'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default ReturnDecisionPanel