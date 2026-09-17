import { useEffect, useMemo, useState } from 'react'

import {
  getSellerOrderDetail,
  getSellerOrderPayment,
  getSellerOrderReceipt,
  getSellerOrders,
  updateSellerOrderItemStatus,
} from '../services/sellerOrdersService'
import './OrdersPage.css'

// 백엔드 상태 코드를 화면용 한글로 변환합니다.
const statusLabels = {
  ORDERED: '주문접수',
  PAYMENT_PENDING: '결제대기',
  PAID: '결제완료',
  PREPARING: '상품준비중',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  COMPLETED: '구매확정',
  CANCELLED: '취소',
  REFUNDED: '환불완료',
}

// 백엔드에서 변경을 허용하는 주문 상품 상태입니다.
const itemStatusOptions = [
  { value: 'ORDERED', label: '주문접수' },
  { value: 'PREPARING', label: '상품준비중' },
  { value: 'SHIPPING', label: '배송중' },
  { value: 'DELIVERED', label: '배송완료' },
  { value: 'COMPLETED', label: '구매확정' },
  { value: 'CANCELLED', label: '취소' },
]

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('ko-KR')
}

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [orderStatus, setOrderStatus] = useState('')

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [receipt, setReceipt] = useState(null)

  // 주문 상품별로 선택한 변경 상태를 저장합니다.
  const [itemStatusDrafts, setItemStatusDrafts] = useState({})
  const [savingItemId, setSavingItemId] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadOrders() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerOrders()

        if (isActive) {
          setOrders(data)
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

    loadOrders()

    return () => {
      isActive = false
    }
  }, [])

  // 검색어와 주문 상태를 화면 목록에 적용합니다.
  const visibleOrders = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesKeyword =
        !normalizedKeyword ||
        order.order_no.toLowerCase().includes(normalizedKeyword)

      const matchesStatus =
        !orderStatus || order.order_status === orderStatus

      return matchesKeyword && matchesStatus
    })
  }, [orders, orderStatus, searchKeyword])

  function handleSearch(event) {
    event.preventDefault()
    setSearchKeyword(keywordInput)
    setSelectedOrder(null)
    setSuccessMessage('')
  }

  function handleReset() {
    setKeywordInput('')
    setSearchKeyword('')
    setOrderStatus('')
    setSelectedOrder(null)
    setSuccessMessage('')
  }

  async function openOrderDetail(orderId) {
    setIsDetailLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setSelectedOrder(null)
    setPayment(null)
    setReceipt(null)

    try {
      // 결제나 영수증이 없더라도 주문 상세는 표시되도록 각각 조회합니다.
      const [detailResult, paymentResult, receiptResult] =
        await Promise.allSettled([
          getSellerOrderDetail(orderId),
          getSellerOrderPayment(orderId),
          getSellerOrderReceipt(orderId),
        ])

      if (detailResult.status === 'rejected') {
        throw detailResult.reason
      }

      const orderDetail = detailResult.value

      setSelectedOrder(orderDetail)

      // 각 상품의 현재 처리 상태를 선택창 기본값으로 넣습니다.
      setItemStatusDrafts(
        Object.fromEntries(
          orderDetail.items.map((item) => [
            item.order_item_id,
            item.item_status,
          ]),
        ),
      )

      if (paymentResult.status === 'fulfilled') {
        setPayment(paymentResult.value)
      }

      if (receiptResult.status === 'fulfilled') {
        setReceipt(receiptResult.value)
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsDetailLoading(false)
    }
  }

  function handleItemStatusChange(orderItemId, itemStatus) {
    setItemStatusDrafts((currentDrafts) => ({
      ...currentDrafts,
      [orderItemId]: itemStatus,
    }))
  }

  async function saveItemStatus(orderItemId) {
    const nextStatus = itemStatusDrafts[orderItemId]

    setSavingItemId(orderItemId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updatedItem = await updateSellerOrderItemStatus(
        orderItemId,
        nextStatus,
      )

      // 상세 화면에서 수정된 상품 한 건만 새 데이터로 교체합니다.
      setSelectedOrder((currentOrder) => ({
        ...currentOrder,
        items: currentOrder.items.map((item) =>
          item.order_item_id === orderItemId
            ? updatedItem
            : item,
        ),
      }))

      setSuccessMessage('주문 상품의 처리 상태가 변경되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSavingItemId(null)
    }
  }

  return (
    <section className="orders-page">
      <div className="orders-heading">
        <div>
          <h1>주문 관리</h1>
          <p>내 상품이 포함된 주문과 처리 상태를 확인합니다.</p>
        </div>

        <div className="orders-summary-card">
          <span>전체 주문</span>
          <strong>{orders.length.toLocaleString('ko-KR')}건</strong>
        </div>
      </div>

      <section className="orders-panel">
        <form className="orders-toolbar" onSubmit={handleSearch}>
          <select
            aria-label="주문 상태"
            value={orderStatus}
            onChange={(event) => {
              setOrderStatus(event.target.value)
              setSelectedOrder(null)
              setSuccessMessage('')
            }}
          >
            <option value="">전체 상태</option>
            <option value="ORDERED">주문접수</option>
            <option value="PAYMENT_PENDING">결제대기</option>
            <option value="PAID">결제완료</option>
            <option value="PREPARING">상품준비중</option>
            <option value="SHIPPING">배송중</option>
            <option value="DELIVERED">배송완료</option>
            <option value="COMPLETED">구매확정</option>
            <option value="CANCELLED">취소</option>
          </select>

          <div className="orders-search">
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="주문번호 검색"
              aria-label="주문번호 검색"
            />

            <button className="orders-search-button" type="submit">
              검색
            </button>

            <button
              className="orders-reset-button"
              type="button"
              disabled={
                !keywordInput && !searchKeyword && !orderStatus
              }
              onClick={handleReset}
            >
              초기화
            </button>
          </div>
        </form>

        <div className="orders-list-summary">
          <strong>
            조회 결과 {visibleOrders.length.toLocaleString('ko-KR')}건
          </strong>
          <span>주문을 선택하면 상세 정보를 확인할 수 있습니다.</span>
        </div>

        {errorMessage && (
          <div className="orders-message" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="orders-success-message" role="status">
            {successMessage}
          </div>
        )}

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>주문일시</th>
                <th>내 상품 수</th>
                <th>내 상품 금액</th>
                <th>주문 상태</th>
                <th>상세</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="orders-table-message">
                    주문 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                visibleOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="orders-table-message">
                      조건에 맞는 주문이 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                visibleOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td>
                      <strong>{order.order_no}</strong>
                    </td>

                    <td>{formatDateTime(order.ordered_at)}</td>

                    <td>
                      {order.my_item_count.toLocaleString('ko-KR')}개
                    </td>

                    <td>{formatCurrency(order.my_item_amount)}</td>

                    <td>
                      <span
                        className={`order-status-badge status-${order.order_status.toLowerCase()}`}
                      >
                        {statusLabels[order.order_status] ||
                          order.order_status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="order-detail-button"
                        type="button"
                        onClick={() =>
                          openOrderDetail(order.order_id)
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
        <section className="order-detail-panel">
          <div className="order-detail-loading">
            주문 상세 정보를 불러오는 중입니다.
          </div>
        </section>
      )}

      {selectedOrder && (
        <section className="order-detail-panel">
          <div className="order-detail-heading">
            <div>
              <span>주문 상세</span>
              <h2>{selectedOrder.order_no}</h2>
            </div>

            <button
              className="order-detail-close"
              type="button"
              onClick={() => {
                setSelectedOrder(null)
                setSuccessMessage('')
              }}
            >
              닫기
            </button>
          </div>

          <div className="order-information-grid">
            <div>
              <span>주문일시</span>
              <strong>
                {formatDateTime(selectedOrder.ordered_at)}
              </strong>
            </div>

            <div>
              <span>주문 상태</span>
              <strong>
                {statusLabels[selectedOrder.order_status] ||
                  selectedOrder.order_status}
              </strong>
            </div>

            <div>
              <span>수령인</span>
              <strong>{selectedOrder.receiver_name}</strong>
            </div>

            <div>
              <span>연락처</span>
              <strong>{selectedOrder.receiver_phone}</strong>
            </div>

            <div>
              <span>결제 상태</span>
              <strong>
                {payment
                  ? statusLabels[payment.payment_status] ||
                    payment.payment_status
                  : '결제 정보 없음'}
              </strong>
            </div>

            <div>
              <span>결제수단</span>
              <strong>{payment?.payment_method || '—'}</strong>
            </div>
          </div>

          <div className="order-items-heading">
            <h3>주문 상품</h3>

            {receipt?.receipt_url && (
              <a
                href={receipt.receipt_url}
                target="_blank"
                rel="noreferrer"
              >
                영수증 보기
              </a>
            )}
          </div>

          <div className="orders-table-wrapper">
            <table className="orders-table order-items-table">
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>SKU</th>
                  <th>수량</th>
                  <th>단가</th>
                  <th>상품 금액</th>
                  <th>처리 상태</th>
                </tr>
              </thead>

              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.order_item_id}>
                    <td>
                      <strong>{item.product_name_snapshot}</strong>
                    </td>

                    <td>{item.sku_snapshot || '—'}</td>

                    <td>
                      {item.quantity.toLocaleString('ko-KR')}개
                    </td>

                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.item_amount)}</td>

                    <td>
                      <div className="order-status-editor">
                        <select
                          value={
                            itemStatusDrafts[item.order_item_id] ??
                            item.item_status
                          }
                          onChange={(event) =>
                            handleItemStatusChange(
                              item.order_item_id,
                              event.target.value,
                            )
                          }
                          aria-label={`${item.product_name_snapshot} 처리 상태`}
                        >
                          {itemStatusOptions.map((status) => (
                            <option
                              value={status.value}
                              key={status.value}
                            >
                              {status.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={
                            savingItemId === item.order_item_id ||
                            itemStatusDrafts[item.order_item_id] ===
                              item.item_status
                          }
                          onClick={() =>
                            saveItemStatus(item.order_item_id)
                          }
                        >
                          {savingItemId === item.order_item_id
                            ? '저장 중'
                            : '저장'}
                        </button>
                      </div>
                    </td>
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

export default OrdersPage