import { useState } from 'react'

import { updateSellerReturnInspection } from '../services/sellerReturnsService'

// 백엔드 검수 결과를 화면용 문구로 변경합니다.
const inspectionResultLabels = {
  PENDING: '검수 대기',
  APPROVED: '반품 승인 가능',
  REJECTED: '반품 반려 필요',
}

// 현재 반품 상품을 입력 폼 형태로 변환합니다.
function createInspectionDrafts(items) {
  return Object.fromEntries(
    items.map((item) => [
      item.return_item_id,
      {
        itemCondition: item.item_condition ?? '',
        inspectionResult:
          item.inspection_result === 'REJECTED'
            ? 'REJECTED'
            : 'APPROVED',
        inspectionNote: item.inspection_note ?? '',
      },
    ]),
  )
}

function ReturnInspectionPanel({
  returnRequest,
  onUpdated,
}) {
  const [inspectionDrafts, setInspectionDrafts] = useState(() =>
    createInspectionDrafts(returnRequest.items ?? []),
  )

  const [savingItemId, setSavingItemId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const items = returnRequest.items ?? []

  const pendingCount = items.filter(
    (item) => item.inspection_result === 'PENDING',
  ).length

  function handleDraftChange(returnItemId, field, value) {
    setInspectionDrafts((currentDrafts) => ({
      ...currentDrafts,
      [returnItemId]: {
        ...currentDrafts[returnItemId],
        [field]: value,
      },
    }))
  }

  async function handleInspectionSave(item) {
    const draft = inspectionDrafts[item.return_item_id]

    setErrorMessage('')

    if (!draft?.itemCondition.trim()) {
      setErrorMessage(
        `${item.product_name_snapshot} 상품의 상태를 입력해 주세요.`,
      )
      return
    }

    // 반려하는 경우 판매자와 관리자 모두 확인할 수 있는 이유가 필요합니다.
    if (
      draft.inspectionResult === 'REJECTED' &&
      !draft.inspectionNote.trim()
    ) {
      setErrorMessage(
        '반품 반려가 필요한 상품은 검수 의견을 입력해 주세요.',
      )
      return
    }

    setSavingItemId(item.return_item_id)

    try {
      const updatedReturn =
        await updateSellerReturnInspection(
          item.return_item_id,
          {
            itemCondition: draft.itemCondition,
            inspectionResult: draft.inspectionResult,
            inspectionNote: draft.inspectionNote,
          },
        )

      // 백엔드에서 받은 최신 검수 결과로 입력값을 다시 맞춥니다.
      setInspectionDrafts(
        createInspectionDrafts(updatedReturn.items ?? []),
      )

      onUpdated(
        updatedReturn,
        `${item.product_name_snapshot} 상품의 검수 결과를 저장했습니다.`,
      )
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSavingItemId(null)
    }
  }

  if (
    !['RECEIVED', 'INSPECTING'].includes(
      returnRequest.return_status,
    )
  ) {
    return null
  }

  return (
    <section className="return-inspection-panel">
        <div className="return-inspection-toolbar">
            <strong>상품별 검수 입력</strong>

            <span className="return-inspection-count">
            검수 대기 {pendingCount}건
            </span>
        </div>

      {errorMessage && (
        <div
          className="return-inspection-message"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="return-inspection-list">
        {items.map((item) => {
          const draft =
            inspectionDrafts[item.return_item_id] ?? {
              itemCondition: '',
              inspectionResult: 'APPROVED',
              inspectionNote: '',
            }

          const isSaving =
            savingItemId === item.return_item_id

          return (
            <article
              className="return-inspection-card"
              key={item.return_item_id}
            >
              <div className="return-inspection-product">
                <div>
                  <span>반품 상품 #{item.return_item_id}</span>
                  <strong>{item.product_name_snapshot}</strong>
                  <small>
                    {item.sku_snapshot || '기본 상품'} · 반품{' '}
                    {item.return_quantity}개
                  </small>
                </div>

                <span
                  className={`inspection-result-badge result-${item.inspection_result.toLowerCase()}`}
                >
                  {inspectionResultLabels[
                    item.inspection_result
                  ] || item.inspection_result}
                </span>
              </div>

              <div className="return-inspection-fields">
                <label>
                  <span>입고 상품 상태 *</span>

                  <input
                    type="text"
                    maxLength="100"
                    value={draft.itemCondition}
                    onChange={(event) =>
                      handleDraftChange(
                        item.return_item_id,
                        'itemCondition',
                        event.target.value,
                      )
                    }
                    disabled={isSaving}
                    placeholder="예: 미개봉, 사용 흔적 있음, 파손"
                  />
                </label>

                <label>
                  <span>검수 결과 *</span>

                  <select
                    value={draft.inspectionResult}
                    onChange={(event) =>
                      handleDraftChange(
                        item.return_item_id,
                        'inspectionResult',
                        event.target.value,
                      )
                    }
                    disabled={isSaving}
                  >
                    <option value="APPROVED">
                      반품 승인 가능
                    </option>
                    <option value="REJECTED">
                      반품 반려 필요
                    </option>
                  </select>
                </label>

                <label className="return-inspection-note">
                  <span>
                    검수 의견
                    {draft.inspectionResult === 'REJECTED'
                      ? ' *'
                      : ''}
                  </span>

                  <textarea
                    rows="3"
                    maxLength="1000"
                    value={draft.inspectionNote}
                    onChange={(event) =>
                      handleDraftChange(
                        item.return_item_id,
                        'inspectionNote',
                        event.target.value,
                      )
                    }
                    disabled={isSaving}
                    placeholder={
                      draft.inspectionResult === 'REJECTED'
                        ? '반려가 필요한 이유를 입력하세요.'
                        : '필요한 경우 검수 의견을 입력하세요.'
                    }
                  />
                </label>
              </div>

              <div className="return-inspection-footer">
                <span>
                  상품별로 검수 결과를 각각 저장해 주세요.
                </span>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    handleInspectionSave(item)
                  }
                >
                  {isSaving ? '저장 중' : '검수 결과 저장'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {pendingCount === 0 && (
        <div className="return-inspection-complete">
          <strong>모든 상품의 검수가 완료되었습니다.</strong>
          <span>
            다음 단계에서 전체 반품 요청을 승인하거나 반려할 수
            있습니다.
          </span>
        </div>
      )}
    </section>
  )
}

export default ReturnInspectionPanel