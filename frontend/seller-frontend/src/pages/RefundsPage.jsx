import { useEffect, useMemo, useState } from 'react'

import {
  getSellerRefundDetail,
  getSellerRefunds,
} from '../services/sellerRefundsService'
import './RefundsPage.css'

const refundStatusLabels = {
  REQUESTED: '접수',
  REVIEWING: '검토중',
  APPROVED: '승인',
  REJECTED: '거절',
  COMPLETED: '환불완료',
}

function formatCurrency(value) {
  if (value === null || value === undefined) {
    return '—'
  }

  return `${Number(value).toLocaleString('ko-KR')}원`
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('ko-KR')
}

function RefundsPage() {
  const [refunds, setRefunds] = useState([])
  const [refundStatus, setRefundStatus] = useState('')

  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [selectedRefund, setSelectedRefund] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadRefunds() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerRefunds(refundStatus)

        if (isActive) {
          setRefunds(data)
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

    loadRefunds()

    return () => {
      isActive = false
    }
  }, [refundStatus])

  // 환불번호, 주문번호 또는 사유를 기준으로 검색합니다.
  const visibleRefunds = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) {
      return refunds
    }

    return refunds.filter((refund) => {
      const refundId = String(refund.refund_request_id)
      const orderId = String(refund.order_id)
      const reason = refund.refund_reason?.toLowerCase() ?? ''

      return (
        refundId.includes(keyword) ||
        orderId.includes(keyword) ||
        reason.includes(keyword)
      )
    })
  }, [refunds, searchKeyword])

  const pendingCount = refunds.filter((refund) =>
    ['REQUESTED', 'REVIEWING'].includes(refund.refund_status),
  ).length

  function handleSearch(event) {
    event.preventDefault()
    setSearchKeyword(keywordInput)
    setSelectedRefund(null)
  }

  function handleReset() {
    setKeywordInput('')
    setSearchKeyword('')
    setRefundStatus('')
    setSelectedRefund(null)
  }

  async function openRefundDetail(refundRequestId) {
    setIsDetailLoading(true)
    setErrorMessage('')
    setSelectedRefund(null)

    try {
      const data = await getSellerRefundDetail(refundRequestId)
      setSelectedRefund(data)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsDetailLoading(false)
    }
  }

  return (
    <section className="refunds-page">
      <div className="refunds-heading">
        <div>
          <h1>환불 관리</h1>
          <p>내 상품에 접수된 환불 요청과 상세 내용을 확인합니다.</p>
        </div>

        <div
          className={`refunds-summary-card ${
            pendingCount > 0 ? 'has-pending' : 'is-clear'
          }`}
        >
          <span>처리 대기</span>
          <strong>{pendingCount.toLocaleString('ko-KR')}건</strong>
        </div>
      </div>

      <div className="refunds-policy-notice">
        <strong>환불 처리 권한 안내</strong>
        <span>
          셀러는 환불 요청을 조회할 수 있으며, 승인과 거절은 관리자가
          처리합니다.
        </span>
      </div>

      <section className="refunds-panel">
        <form className="refunds-toolbar" onSubmit={handleSearch}>
          <select
            aria-label="환불 상태"
            value={refundStatus}
            onChange={(event) => {
              setRefundStatus(event.target.value)
              setSelectedRefund(null)
            }}
          >
            <option value="">전체 상태</option>
            <option value="REQUESTED">접수</option>
            <option value="REVIEWING">검토중</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">거절</option>
            <option value="COMPLETED">환불완료</option>
          </select>

          <div className="refunds-search">
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="환불번호, 주문번호 또는 환불 사유 검색"
              aria-label="환불 검색어"
            />

            <button className="refunds-search-button" type="submit">
              검색
            </button>

            <button
              className="refunds-reset-button"
              type="button"
              disabled={
                !keywordInput && !searchKeyword && !refundStatus
              }
              onClick={handleReset}
            >
              초기화
            </button>
          </div>
        </form>

        <div className="refunds-list-summary">
          <strong>
            조회 결과 {visibleRefunds.length.toLocaleString('ko-KR')}건
          </strong>
          <span>상세 보기에서 환불 대상 상품을 확인할 수 있습니다.</span>
        </div>

        {errorMessage && (
          <div className="refunds-message" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="refunds-table-wrapper">
          <table className="refunds-table">
            <thead>
              <tr>
                <th>환불번호</th>
                <th>주문번호</th>
                <th>요청일시</th>
                <th>환불 사유</th>
                <th>요청금액</th>
                <th>승인금액</th>
                <th>상태</th>
                <th>상세</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="8" className="refunds-table-message">
                    환불 요청을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                visibleRefunds.length === 0 && (
                  <tr>
                    <td colSpan="8" className="refunds-table-message">
                      조건에 맞는 환불 요청이 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                visibleRefunds.map((refund) => (
                  <tr key={refund.refund_request_id}>
                    <td>
                      <strong>#{refund.refund_request_id}</strong>
                    </td>

                    <td>#{refund.order_id}</td>
                    <td>{formatDateTime(refund.requested_at)}</td>
                    <td>{refund.refund_reason || '사유 없음'}</td>
                    <td>{formatCurrency(refund.requested_amount)}</td>
                    <td>{formatCurrency(refund.approved_amount)}</td>

                    <td>
                      <span
                        className={`refund-status-badge status-${refund.refund_status.toLowerCase()}`}
                      >
                        {refundStatusLabels[refund.refund_status] ||
                          refund.refund_status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="refund-detail-button"
                        type="button"
                        onClick={() =>
                          openRefundDetail(
                            refund.refund_request_id,
                          )
                        }
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {isDetailLoading && (
        <section className="refund-detail-panel">
          <div className="refund-detail-loading">
            환불 상세 정보를 불러오는 중입니다.
          </div>
        </section>
      )}

      {selectedRefund && (
        <section className="refund-detail-panel">
          <div className="refund-detail-heading">
            <div>
              <span>환불 상세</span>
              <h2>환불 #{selectedRefund.refund_request_id}</h2>
            </div>

            <button
              className="refund-detail-close"
              type="button"
              onClick={() => setSelectedRefund(null)}
            >
              닫기
            </button>
          </div>

          <div className="refund-information-grid">
            <div>
              <span>주문번호</span>
              <strong>#{selectedRefund.order_id}</strong>
            </div>

            <div>
              <span>요청일시</span>
              <strong>
                {formatDateTime(selectedRefund.requested_at)}
              </strong>
            </div>

            <div>
              <span>환불 상태</span>
              <strong>
                {refundStatusLabels[selectedRefund.refund_status] ||
                  selectedRefund.refund_status}
              </strong>
            </div>

            <div>
              <span>환불 사유</span>
              <strong>
                {selectedRefund.refund_reason || '사유 없음'}
              </strong>
            </div>

            <div>
              <span>요청금액</span>
              <strong>
                {formatCurrency(selectedRefund.requested_amount)}
              </strong>
            </div>

            <div>
              <span>승인금액</span>
              <strong>
                {formatCurrency(selectedRefund.approved_amount)}
              </strong>
            </div>
          </div>

          <div className="refund-items-heading">
            <h3>환불 대상 상품</h3>
          </div>

          <div className="refunds-table-wrapper">
            <table className="refunds-table refund-items-table">
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>주문 상품 ID</th>
                  <th>환불 수량</th>
                  <th>환불 금액</th>
                </tr>
              </thead>

              <tbody>
                {selectedRefund.items.map((item) => (
                  <tr key={item.refund_item_id}>
                    <td>
                      <strong>
                        {item.product_name_snapshot || '상품명 없음'}
                      </strong>
                    </td>
                    <td>#{item.order_item_id}</td>
                    <td>
                      {item.refund_quantity.toLocaleString('ko-KR')}개
                    </td>
                    <td>{formatCurrency(item.refund_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  )
}

export default RefundsPage