import { Fragment, useEffect, useState } from 'react'

import ReturnDetailPanel from '../components/ReturnDetailPanel'
import { getSellerReturns } from '../services/sellerReturnsService'
import './ReturnsPage.css'

// 백엔드 상태 코드를 판매자용 문구로 바꿉니다.
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

const pickupMethodLabels = {
  PICKUP: '택배 회수',
  SELF_SHIP: '고객 직접 발송',
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('ko-KR')
}

function ReturnsPage() {
  const [returns, setReturns] = useState([])
  const [total, setTotal] = useState(0)

  const [page, setPage] = useState(1)
  const pageSize = 20

  const [returnStatus, setReturnStatus] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 현재 펼쳐진 반품번호만 저장합니다.
  // 하나의 번호만 저장하므로 상세 화면도 한 번에 하나만 열립니다.
  const [selectedReturnId, setSelectedReturnId] =
    useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // 회수·검수·승인 처리 후 목록을 다시 불러오기 위한 값입니다.
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadReturns() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerReturns({
          page,
          size: pageSize,
          returnStatus,
          keyword: searchKeyword,
        })

        if (isActive) {
          setReturns(data.items ?? [])
          setTotal(data.total ?? 0)
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

    loadReturns()

    return () => {
      isActive = false
    }
  }, [page, returnStatus, searchKeyword, refreshKey])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function handleSearch(event) {
    event.preventDefault()

    setPage(1)
    setSearchKeyword(keywordInput)
    setSelectedReturnId(null)
  }

  function handleStatusChange(event) {
    setPage(1)
    setReturnStatus(event.target.value)
    setSelectedReturnId(null)
  }

  function handleReset() {
    setPage(1)
    setReturnStatus('')
    setKeywordInput('')
    setSearchKeyword('')
    setSelectedReturnId(null)
  }

  function handleDetailToggle(returnRequestId) {
    setSelectedReturnId((currentId) =>
      currentId === returnRequestId
        ? null
        : returnRequestId,
    )
  }

  // 상세 화면에서 상태가 변경되면 목록 행도 즉시 갱신합니다.
  function handleReturnChanged(updatedReturn) {
    setReturns((currentReturns) =>
      currentReturns.map((returnRequest) =>
        returnRequest.return_request_id ===
        updatedReturn.return_request_id
          ? {
              ...returnRequest,
              ...updatedReturn,
            }
          : returnRequest,
      ),
    )

    // 서버 기준으로 목록을 한 번 더 조회해 화면을 동기화합니다.
    setRefreshKey((currentKey) => currentKey + 1)
  }

  return (
    <section className="returns-page">
      <div className="returns-heading">
        <div>
          <h1>반품 관리</h1>
          <p>
            고객이 신청한 반품의 회수, 검수 및 승인 상태를
            관리합니다.
          </p>
        </div>

        <div className="returns-summary-card">
          <span>전체 반품 요청</span>
          <strong>{total.toLocaleString('ko-KR')}건</strong>
        </div>
      </div>

      <div className="returns-policy-notice">
        <strong>반품 처리 안내</strong>

        <span>
          상품 회수와 검수가 끝난 후 셀러가 승인하면 관리자에게
          최종 반품 처리를 요청합니다.
        </span>
      </div>

      <section className="returns-panel">
        <form className="returns-toolbar" onSubmit={handleSearch}>
          <select
            aria-label="반품 상태"
            value={returnStatus}
            onChange={handleStatusChange}
          >
            <option value="">전체 상태</option>
            <option value="REQUESTED">반품 접수</option>
            <option value="PICKUP_REQUESTED">회수 요청</option>
            <option value="PICKED_UP">회수 완료</option>
            <option value="RECEIVED">입고 완료</option>
            <option value="INSPECTING">검수 중</option>
            <option value="APPROVED">셀러 승인</option>
            <option value="REJECTED">반품 반려</option>
            <option value="COMPLETED">처리 완료</option>
            <option value="CANCELLED">반품 취소</option>
          </select>

          <div className="returns-search">
            <input
              type="search"
              value={keywordInput}
              onChange={(event) =>
                setKeywordInput(event.target.value)
              }
              placeholder="주문번호, 고객명 또는 상품명 검색"
              aria-label="반품 검색어"
            />

            <button className="returns-search-button" type="submit">
              검색
            </button>

            <button
              className="returns-reset-button"
              type="button"
              disabled={
                !keywordInput &&
                !searchKeyword &&
                !returnStatus
              }
              onClick={handleReset}
            >
              초기화
            </button>
          </div>
        </form>

        <div className="returns-list-summary">
          <strong>
            조회 결과 {total.toLocaleString('ko-KR')}건
          </strong>

          <span>
            상세 보기를 누르면 선택한 요청 바로 아래에서
            처리할 수 있습니다.
          </span>
        </div>

        {errorMessage && (
          <div className="returns-message is-error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="returns-table-wrapper">
          <table className="returns-table">
            <thead>
              <tr>
                <th>반품번호</th>
                <th>주문번호</th>
                <th>고객명</th>
                <th>신청일시</th>
                <th>상품 수</th>
                <th>반품 수량</th>
                <th>회수 방식</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="9" className="returns-table-message">
                    반품 요청을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                returns.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      className="returns-table-message"
                    >
                      조건에 맞는 반품 요청이 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                returns.map((returnRequest) => {
                  const isSelected =
                    selectedReturnId ===
                    returnRequest.return_request_id

                  return (
                    <Fragment
                      key={returnRequest.return_request_id}
                    >
                      <tr
                        className={
                          isSelected
                            ? 'return-list-row is-selected'
                            : 'return-list-row'
                        }
                      >
                        <td>
                          <strong>
                            #{returnRequest.return_request_id}
                          </strong>
                        </td>

                        <td>{returnRequest.order_no}</td>
                        <td>
                          {returnRequest.buyer_name || '—'}
                        </td>
                        <td>
                          {formatDateTime(
                            returnRequest.requested_at,
                          )}
                        </td>
                        <td>{returnRequest.item_count}건</td>
                        <td>
                          {returnRequest.total_return_quantity}개
                        </td>
                        <td>
                          {pickupMethodLabels[
                            returnRequest.pickup_method
                          ] || returnRequest.pickup_method}
                        </td>

                        <td>
                          <span
                            className={`return-status-badge status-${returnRequest.return_status.toLowerCase()}`}
                          >
                            {returnStatusLabels[
                              returnRequest.return_status
                            ] || returnRequest.return_status}
                          </span>
                        </td>

                        <td>
                          <button
                            className={
                              isSelected
                                ? 'return-detail-button is-open'
                                : 'return-detail-button'
                            }
                            type="button"
                            aria-expanded={isSelected}
                            onClick={() =>
                              handleDetailToggle(
                                returnRequest.return_request_id,
                              )
                            }
                          >
                            {isSelected
                              ? '상세 닫기'
                              : '상세 보기'}
                          </button>
                        </td>
                      </tr>

                      {isSelected && (
                        <tr className="return-inline-row">
                          <td colSpan="9">
                            <ReturnDetailPanel
                              returnRequestId={
                                returnRequest.return_request_id
                              }
                              onChanged={handleReturnChanged}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
            </tbody>
          </table>
        </div>

        <div className="returns-pagination">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => {
              setSelectedReturnId(null)
              setPage((currentPage) => currentPage - 1)
            }}
          >
            이전
          </button>

          <span>
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => {
              setSelectedReturnId(null)
              setPage((currentPage) => currentPage + 1)
            }}
          >
            다음
          </button>
        </div>
      </section>
    </section>
  )
}

export default ReturnsPage