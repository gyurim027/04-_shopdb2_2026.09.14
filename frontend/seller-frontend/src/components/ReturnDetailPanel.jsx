import { useEffect, useState } from 'react'

import {
  getSellerReturnDetail,
  updateSellerReturnPickup,
} from '../services/sellerReturnsService'
import ReturnDecisionPanel from './ReturnDecisionPanel'
import ReturnInspectionPanel from './ReturnInspectionPanel'

const returnStatusLabels = {
  REQUESTED: '반품 접수',
  PICKUP_REQUESTED: '회수 요청',
  PICKED_UP: '회수 완료',
  RECEIVED: '입고 완료',
  INSPECTING: '검수 중',
  APPROVED: '셀러 승인',
  REJECTED: '반품 반려',
  COMPLETED: '처리 완료',
  CANCELLED: '반품 취소',
}

const inspectionResultLabels = {
  PENDING: '검수 대기',
  APPROVED: '반품 승인 가능',
  REJECTED: '반품 반려 필요',
}

const pickupMethodLabels = {
  PICKUP: '택배 회수',
  SELF_SHIP: '고객 직접 발송',
}

// 현재 상태에서 선택할 수 있는 다음 회수 상태입니다.
const pickupStatusOptions = {
  REQUESTED: [
    {
      value: 'PICKUP_REQUESTED',
      label: '회수 요청',
    },
    {
      value: 'PICKED_UP',
      label: '회수 완료',
    },
  ],
  PICKUP_REQUESTED: [
    {
      value: 'PICKED_UP',
      label: '회수 완료',
    },
  ],
  PICKED_UP: [
    {
      value: 'RECEIVED',
      label: '입고 완료',
    },
  ],
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('ko-KR')
}

function ReturnDetailPanel({
  returnRequestId,
  onChanged,
}) {
  const [returnDetail, setReturnDetail] = useState(null)

  const [pickupForm, setPickupForm] = useState({
    returnStatus: '',
    carrierName: '',
    trackingNo: '',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPickup, setIsSavingPickup] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // 반품번호가 바뀌면 해당 요청의 최신 상세 정보를 조회합니다.
  useEffect(() => {
    let isActive = true

    async function loadDetail() {
      setIsLoading(true)
      setErrorMessage('')
      setSuccessMessage('')

      try {
        const data =
          await getSellerReturnDetail(returnRequestId)

        if (isActive) {
          setReturnDetail(data)
          setPickupFormFromDetail(data)
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      isActive = false
    }
  }, [returnRequestId])

  function setPickupFormFromDetail(detail) {
    const availableOptions =
      pickupStatusOptions[detail.return_status] ?? []

    setPickupForm({
      returnStatus: availableOptions[0]?.value ?? '',
      carrierName: detail.carrier_name ?? '',
      trackingNo: detail.tracking_no ?? '',
    })
  }

  function handlePickupFormChange(event) {
    const { name, value } = event.target

    setPickupForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handlePickupSubmit(event) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (!returnDetail || !pickupForm.returnStatus) {
      setErrorMessage('변경할 회수 상태를 선택해 주세요.')
      return
    }

    if (
      ['PICKED_UP', 'RECEIVED'].includes(
        pickupForm.returnStatus,
      ) &&
      (!pickupForm.carrierName.trim() ||
        !pickupForm.trackingNo.trim())
    ) {
      setErrorMessage(
        '회수 완료 처리 전 택배사와 운송장 번호를 입력해 주세요.',
      )
      return
    }

    setIsSavingPickup(true)

    try {
      const updatedReturn = await updateSellerReturnPickup(
        returnDetail.return_request_id,
        {
          returnStatus: pickupForm.returnStatus,
          carrierName: pickupForm.carrierName,
          trackingNo: pickupForm.trackingNo,
        },
      )

      setReturnDetail(updatedReturn)
      setPickupFormFromDetail(updatedReturn)

      setSuccessMessage(
        `반품 상태가 ${
          returnStatusLabels[updatedReturn.return_status] ||
          updatedReturn.return_status
        } 상태로 변경되었습니다.`,
      )

      // 목록 행의 상태도 최신 상태로 바꾸도록 부모 화면에 알립니다.
      onChanged(updatedReturn)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingPickup(false)
    }
  }

  function handleInspectionUpdated(updatedReturn, message) {
    setReturnDetail(updatedReturn)
    setPickupFormFromDetail(updatedReturn)
    setErrorMessage('')
    setSuccessMessage(message)
    onChanged(updatedReturn)
  }

  function handleDecisionUpdated(updatedReturn, message) {
    setReturnDetail(updatedReturn)
    setPickupFormFromDetail(updatedReturn)
    setErrorMessage('')
    setSuccessMessage(message)
    onChanged(updatedReturn)
  }

  if (isLoading) {
    return (
      <div className="return-inline-loading">
        반품 상세 정보를 불러오는 중입니다.
      </div>
    )
  }

  if (!returnDetail) {
    return (
      <div className="return-inline-error">
        {errorMessage || '반품 상세 정보를 불러오지 못했습니다.'}
      </div>
    )
  }

  const items = returnDetail.items ?? []

  const pendingInspectionCount = items.filter(
    (item) => item.inspection_result === 'PENDING',
  ).length

    const availablePickupStatuses =
    pickupStatusOptions[returnDetail.return_status] ?? []

  // 요청 상태가 승인·반려 등 최종 상태인지 확인합니다.
  const hasTerminalStatus = [
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED',
  ].includes(returnDetail.return_status)

  // 실제 입고일시가 있어야 회수 단계가 정상적으로 끝난 것입니다.
  const pickupCompleted = Boolean(returnDetail.received_at)

  const pickupDataMissing =
    hasTerminalStatus && !pickupCompleted


  // 상품 검수 자체의 완료 여부입니다.
  const allItemsInspected =
    items.length > 0 && pendingInspectionCount === 0

  // 입고도 끝났고 모든 상품의 검수 결과도 있어야 정상 완료입니다.
  const inspectionCompleted =
    pickupCompleted && allItemsInspected

  // 최종 상태인데 선행 회수·검수 데이터가 없다면 정합성 오류입니다.
  const hasDataInconsistency =
    hasTerminalStatus &&
    (!pickupCompleted || !allItemsInspected)

  const decisionCompleted =
    hasTerminalStatus && !hasDataInconsistency

      // 최종 단계 배지의 색상과 문구가 같은 조건을 사용하도록 통일합니다.
  const finalStepStatusClass = hasDataInconsistency
    ? 'is-warning'
    : decisionCompleted
      ? 'is-complete'
      : inspectionCompleted
        ? 'is-current'
        : 'is-locked'

  const finalStepStatusLabel = hasDataInconsistency
    ? '데이터 확인 필요'
    : decisionCompleted
      ? '처리 완료'
      : inspectionCompleted
        ? '결정 필요'
        : '진행 전'

  const inspectionVersion = items
    .map(
      (item) =>
        `${item.return_item_id}-${item.inspection_result}`,
    )
    .join('-')

  return (
    <div className="return-inline-detail">
      <div className="return-inline-heading">
        <div>
          <span>반품 상세</span>
          <h2>반품 #{returnDetail.return_request_id}</h2>
        </div>
      </div>

      {successMessage && (
        <div className="returns-message is-success" role="status">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="returns-message is-error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="return-information-grid">
        <div>
          <span>주문번호</span>
          <strong>{returnDetail.order_no}</strong>
        </div>

        <div>
          <span>고객명</span>
          <strong>{returnDetail.buyer_name || '—'}</strong>
        </div>

        <div>
          <span>현재 상태</span>
          <strong>
            {returnStatusLabels[returnDetail.return_status] ||
              returnDetail.return_status}
          </strong>
        </div>

        <div>
          <span>반품 사유 코드</span>
          <strong>{returnDetail.return_reason_code}</strong>
        </div>

        <div>
          <span>상세 사유</span>
          <strong>
            {returnDetail.return_reason_detail || '—'}
          </strong>
        </div>

        <div>
          <span>신청일시</span>
          <strong>
            {formatDateTime(returnDetail.requested_at)}
          </strong>
        </div>
      </div>

      {/* 1단계: 회수 처리 */}
      <section className="return-workflow-step">
        <div className="return-workflow-heading">
          <div className="return-workflow-number">1</div>

          <div>
            <h3>회수 처리</h3>
            <p>
              반품 상품의 택배사, 운송장 번호와 입고 상태를
              관리합니다.
            </p>
          </div>

        <span
            className={`return-step-status ${
              pickupDataMissing
                ? 'is-warning'
                : pickupCompleted
                  ? 'is-complete'
                  : 'is-current'
            }`}
          >
            {pickupDataMissing
              ? '데이터 확인 필요'
              : pickupCompleted
                ? '완료'
                : '진행 중'}
          </span>
        </div>

        {pickupDataMissing ? (
          <div className="return-data-warning">
            <strong>회수 완료 기록이 없습니다.</strong>

            <span>
               입고일시가 확인되지 않습니다.
               관리자에게 데이터 확인을 요청해 주세요.
            </span>
          </div>
        ) : pickupCompleted ? (
          <div className="return-step-summary">
            <div>
              <span>회수 방식</span>
              <strong>
                {pickupMethodLabels[
                  returnDetail.pickup_method
                ] || returnDetail.pickup_method}
              </strong>
            </div>

            <div>
              <span>택배사</span>
              <strong>{returnDetail.carrier_name || '—'}</strong>
            </div>

            <div>
              <span>운송장 번호</span>
              <strong>{returnDetail.tracking_no || '—'}</strong>
            </div>

            <div>
              <span>입고일시</span>
              <strong>
                {formatDateTime(returnDetail.received_at)}
              </strong>
            </div>
          </div>
        ) : (
          <form
            className="return-pickup-panel"
            onSubmit={handlePickupSubmit}
          >
            <div className="return-pickup-grid">
              <label>
                <span>변경할 상태 *</span>

                <select
                  name="returnStatus"
                  value={pickupForm.returnStatus}
                  onChange={handlePickupFormChange}
                  disabled={isSavingPickup}
                >
                  {availablePickupStatuses.map((option) => (
                    <option
                      value={option.value}
                      key={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>택배사</span>

                <input
                  type="text"
                  name="carrierName"
                  maxLength="100"
                  value={pickupForm.carrierName}
                  onChange={handlePickupFormChange}
                  disabled={isSavingPickup}
                  placeholder="예: CJ대한통운"
                />
              </label>

              <label>
                <span>운송장 번호</span>

                <input
                  type="text"
                  name="trackingNo"
                  maxLength="100"
                  value={pickupForm.trackingNo}
                  onChange={handlePickupFormChange}
                  disabled={isSavingPickup}
                  placeholder="운송장 번호 입력"
                />
              </label>
            </div>

            <div className="return-pickup-footer">
              <span>
                회수 완료 또는 입고 완료 처리 시 택배사와
                운송장 번호가 필요합니다.
              </span>

              <button
                type="submit"
                disabled={isSavingPickup}
              >
                {isSavingPickup
                  ? '저장 중'
                  : '회수 상태 저장'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2단계: 상품 검수 */}
      <section className="return-workflow-step">
        <div className="return-workflow-heading">
          <div className="return-workflow-number">2</div>

          <div>
            <h3>상품 검수</h3>
            <p>
              입고된 상품 상태와 반품 가능 여부를 상품별로
              확인합니다.
            </p>
          </div>

        <span
            className={`return-step-status ${
              hasDataInconsistency
                ? 'is-warning'
                : decisionCompleted
                  ? 'is-complete'
                  : inspectionCompleted
                    ? 'is-current'
                    : 'is-locked'
            }`}
          >
            {hasDataInconsistency
              ? '데이터 확인 필요'
              : decisionCompleted
                ? '처리 완료'
                : inspectionCompleted
                  ? '결정 필요'
                  : '진행 전'}
          </span>
        </div>

        {!pickupCompleted && (
          <div className="return-step-locked">
            상품이 입고 완료된 후 검수 결과를 입력할 수 있습니다.
          </div>
        )}

        {pickupCompleted && (
          <>
            <div className="returns-table-wrapper">
              <table className="returns-table return-items-table">
                <thead>
                  <tr>
                    <th>상품명</th>
                    <th>상품 옵션</th>
                    <th>주문 수량</th>
                    <th>반품 수량</th>
                    <th>상품 상태</th>
                    <th>검수 결과</th>
                    <th>검수 의견</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.return_item_id}>
                      <td>
                        <strong>
                          {item.product_name_snapshot}
                        </strong>
                      </td>
                      <td>
                        {item.sku_snapshot || '기본 상품'}
                      </td>
                      <td>{item.ordered_quantity}개</td>
                      <td>{item.return_quantity}개</td>
                      <td>
                        {item.item_condition || '미입력'}
                      </td>
                      <td>
                        {inspectionResultLabels[
                          item.inspection_result
                        ] || item.inspection_result}
                      </td>
                      <td>{item.inspection_note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ReturnInspectionPanel
              key={`${returnDetail.return_request_id}-${returnDetail.return_status}-${inspectionVersion}`}
              returnRequest={returnDetail}
              onUpdated={handleInspectionUpdated}
            />
          </>
        )}
      </section>

      {/* 3단계: 셀러 최종 결정 */}
      <section className="return-workflow-step is-decision-step">
        <div className="return-workflow-heading">
          <div className="return-workflow-number">3</div>

          <div>
            <h3> 반품 결재 승인</h3>
            <p>
              관리자에게 반품 결재를 요청하거나
              반려합니다.
            </p>
          </div>

          <span
            className={`return-step-status ${finalStepStatusClass}`}
          >
            {finalStepStatusLabel}
          </span>
        </div>

        {hasDataInconsistency && (
          <div className="return-data-warning">
            <strong>
              반품 상태와 처리 이력이 일치하지 않습니다.
            </strong>

            <span>
              최종 처리 상태이지만 회수 또는 상품 검수 기록이
              완료되지 않았습니다. 이 화면에서는 추가 처리를 할
              수 없으며 관리자에게 데이터 확인을 요청해 주세요.
            </span>
          </div>
        )}

        {!hasDataInconsistency && !inspectionCompleted && (
          <div className="return-step-locked">
            모든 반품 상품의 검수를 완료한 후 최종 처리할 수
            있습니다.
          </div>
        )}

        {decisionCompleted && (
          <div
            className={`return-final-result status-${returnDetail.return_status.toLowerCase()}`}
          >
            <strong>
              {returnStatusLabels[returnDetail.return_status] ||
                returnDetail.return_status}
            </strong>

            <span>
              {returnDetail.return_status === 'APPROVED'
                ? '관리자에게 최종 반품 처리를 요청했습니다.'
                : returnDetail.return_status === 'REJECTED'
                  ? '상품 검수 결과에 따라 반품 요청을 반려했습니다.'
                  : '반품 요청의 최종 처리가 완료되었습니다.'}
            </span>
          </div>
        )}

        {!decisionCompleted && inspectionCompleted && (
          <ReturnDecisionPanel
            key={`decision-${returnDetail.return_request_id}-${returnDetail.return_status}-${inspectionVersion}`}
            returnRequest={returnDetail}
            onUpdated={handleDecisionUpdated}
          />
        )}
      </section>
    </div>
  )
}

export default ReturnDetailPanel