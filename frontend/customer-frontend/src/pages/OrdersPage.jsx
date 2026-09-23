import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ImageOff, RotateCcw, Search, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import {
  ITEM_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  RETURN_STATUS_LABELS,
  orderStatusTone,
  statusLabel,
} from '../utils/status'
import {
  buildClaimedQuantityMap,
  buildLinkedRefundIds,
  getRemainingQuantity,
  getEffectiveReturnStatus,
  refundRequestHeadline,
  returnRequestHeadline,
} from '../utils/refundReturn'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')

function formatOrderDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 주문`
}

function formatRequestDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`
}

function productImageFromDetail(product) {
  if (!product) return null
  if (product.main_image_url) return resolveMediaUrl(product.main_image_url)
  const images = Array.isArray(product.images) ? product.images : []
  const main = images.find((image) => image.image_type === 'MAIN') || images[0]
  return resolveMediaUrl(main?.content_url || main?.public_url || main?.thumbnail_url)
}

function statusGroup(status = '') {
  if (['READY', 'CREATED', 'ORDERED', 'PENDING', 'PENDING_PAYMENT', 'PAYMENT_PENDING'].includes(status)) return 'PAYMENT'
  if (status === 'PAID') return 'PAID'
  if (['PREPARING', 'SHIPPING', 'SHIPPED', 'IN_TRANSIT'].includes(status)) return 'SHIPPING'
  if (['DELIVERED', 'COMPLETED', 'REFUNDED', 'CANCELLED'].includes(status)) return 'DONE'
  return 'OTHER'
}

function canTrack(status = '') {
  return ['SHIPPING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(status)
}

function requestAction(status = '', orderId) {
  if (status === 'PAID' || status === 'PREPARING') {
    return {
      label: '주문취소',
      to: `/refunds?mode=refund&orderId=${orderId}`,
      className: 'danger',
    }
  }

  if (['SHIPPING', 'SHIPPED', 'IN_TRANSIT'].includes(status)) {
    return {
      label: '주문 · 배송 취소',
      to: `/refunds?mode=refund&orderId=${orderId}`,
      className: 'danger',
    }
  }

  if (status === 'DELIVERED') {
    return {
      label: '환불/반품 신청',
      to: `/refunds?orderId=${orderId}`,
      className: '',
    }
  }

  return null
}

function OrderThumb({ src, name }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className="orders-product-thumb orders-product-thumb-empty"><ImageOff size={20} /></div>
  }
  return (
    <div className="orders-product-thumb">
      <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [orderDetails, setOrderDetails] = useState({})
  const [productMeta, setProductMeta] = useState({})
  const [refundDetails, setRefundDetails] = useState([])
  const [returnDetails, setReturnDetails] = useState([])
  const [claimedQuantityMap, setClaimedQuantityMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [period, setPeriod] = useState('6M')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, index) => String(currentYear - index))

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')

    try {
      const [orderResult, refundResult, returnResult] = await Promise.all([
        customerApi.getOrders({ size: 100 }),
        customerApi.getRefunds({ size: 100 }),
        customerApi.getReturns({ size: 100 }),
      ])

      const orderList = orderResult?.items || []
      const refundList = refundResult?.items || []
      const returnList = returnResult?.items || []

      const [orderDetailRows, refundDetailRows, returnDetailRows] = await Promise.all([
        Promise.all(orderList.map((order) => customerApi.getOrder(order.order_id))),
        Promise.all(refundList.map((request) => customerApi.getRefund(request.refund_request_id))),
        Promise.all(returnList.map((request) => customerApi.getReturn(request.return_request_id))),
      ])

      const nextDetails = {}
      const productIds = new Set()

      orderDetailRows.forEach((detail) => {
        nextDetails[detail.order_id] = detail
        ;(detail.items || []).forEach((item) => {
          const id = Number(item.product_id)
          if (Number.isFinite(id) && id > 0) productIds.add(id)
        })
      })

      ;[...refundDetailRows, ...returnDetailRows].forEach((request) => {
        ;(request?.items || []).forEach((item) => {
          const id = Number(item.product_id)
          if (Number.isFinite(id) && id > 0) productIds.add(id)
        })
      })

      const productRows = await Promise.all(
        [...productIds].map(async (productId) => [productId, await customerApi.getProduct(productId)]),
      )

      const nextProducts = {}
      productRows.forEach(([productId, product]) => {
        nextProducts[productId] = product
      })

      setOrders(orderList)
      setOrderDetails(nextDetails)
      setProductMeta(nextProducts)
      setRefundDetails(refundDetailRows)
      setReturnDetails(returnDetailRows)
      setClaimedQuantityMap(buildClaimedQuantityMap(refundDetailRows, returnDetailRows))
    } catch (e) {
      setError(e.message || '주문 및 환불/반품 내역을 불러오지 못했습니다.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(() => {
      load({ silent: true })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  const entries = useMemo(() => {
    const normalEntries = orders.flatMap((summary) => {
      const detail = orderDetails[summary.order_id] || summary
      const originalItems = detail.items || []
      const visibleItems = originalItems
        .map((item) => ({
          ...item,
          display_quantity: getRemainingQuantity(item, claimedQuantityMap),
        }))
        .filter((item) => item.display_quantity > 0)

      if (originalItems.length && !visibleItems.length) return []

      return [{
        kind: 'order',
        key: `order-${summary.order_id}`,
        orderId: summary.order_id,
        order: { ...detail, items: visibleItems },
        summary,
        sortAt: detail.ordered_at || summary.ordered_at,
        filterDate: detail.ordered_at || summary.ordered_at,
        group: statusGroup(detail.order_status || summary.order_status),
      }]
    })

    const linkedRefundIds = buildLinkedRefundIds(returnDetails)

    const refundEntries = refundDetails
      .filter((request) => !linkedRefundIds.has(Number(request.refund_request_id)))
      .map((request) => {
        const order = orderDetails[request.order_id] || {}
        return {
          kind: 'refund',
          key: `refund-${request.refund_request_id}`,
          orderId: request.order_id,
          order,
          request,
          sortAt: request.requested_at,
          filterDate: request.requested_at,
          group: 'REQUEST',
        }
      })

    const returnEntries = returnDetails.map((request) => {
      const order = orderDetails[request.order_id] || {}
      return {
        kind: 'return',
        key: `return-${request.return_request_id}`,
        orderId: request.order_id,
        order,
        request,
        sortAt: request.requested_at,
        filterDate: request.requested_at,
        group: 'REQUEST',
      }
    })

    return [...normalEntries, ...refundEntries, ...returnEntries]
      .sort((a, b) => new Date(b.sortAt || 0) - new Date(a.sortAt || 0))
  }, [orders, orderDetails, refundDetails, returnDetails, claimedQuantityMap])

  const filteredEntries = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 6)

    return entries.filter((entry) => {
      const dateValue = new Date(entry.filterDate)
      const periodMatch = period === '6M'
        ? (!Number.isNaN(dateValue.getTime()) && dateValue >= sixMonthsAgo)
        : (!Number.isNaN(dateValue.getTime()) && String(dateValue.getFullYear()) === period)

      const statusMatch = statusFilter === 'ALL' || entry.group === statusFilter
      const itemRows = entry.kind === 'order' ? (entry.order.items || []) : (entry.request.items || [])
      const productNames = itemRows.map((item) => item.product_name_snapshot || '').join(' ').toLowerCase()
      const orderNo = String(entry.order.order_no || entry.request?.order_no || '').toLowerCase()
      const keywordMatch = !q || productNames.includes(q) || orderNo.includes(q)

      return periodMatch && statusMatch && keywordMatch
    })
  }, [entries, keyword, period, statusFilter])

  const renderProductRow = (item, quantity) => {
    const product = productMeta[Number(item.product_id)]
    const src = resolveMediaUrl(item.main_image_url || item.thumbnail_url) || productImageFromDetail(product)

    return (
      <div className="orders-market-product-row" key={`${item.order_item_id}-${quantity}`}>
        <Link to={`/products/${item.product_id}`} className="orders-market-product-link">
          <OrderThumb src={src} name={item.product_name_snapshot} />
          <div className="orders-market-product-copy">
            <strong>{item.product_name_snapshot}</strong>
            <span>
              {money(item.unit_price || (Number(item.item_amount || 0) / Math.max(Number(item.quantity || item.ordered_quantity || 1), 1)))}원 · {quantity}개
            </span>
          </div>
        </Link>
        {item.item_status && (
          <span className={`order-item-status-badge compact ${orderStatusTone(item.item_status)}`}>
            {statusLabel(ITEM_STATUS_LABELS, item.item_status)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="container page-section orders-market-page">
      <div className="orders-market-title">
        <h1>주문목록</h1>
      </div>

      <label className="orders-market-search">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="주문한 상품을 검색할 수 있어요!" />
        <Search size={20} />
      </label>

      <div className="orders-period-row">
        <div className="orders-period-buttons">
          <button type="button" className={period === '6M' ? 'active' : ''} onClick={() => setPeriod('6M')}>최근 6개월</button>
          {years.map((year) => <button key={year} type="button" className={period === year ? 'active' : ''} onClick={() => setPeriod(year)}>{year}</button>)}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="주문 상태 필터">
          <option value="ALL">전체 상태</option>
          <option value="PAYMENT">결제 전</option>
          <option value="PAID">결제 완료</option>
          <option value="SHIPPING">배송/처리</option>
          <option value="DONE">완료</option>
          <option value="REQUEST">환불/반품</option>
        </select>
      </div>

      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}

      {loading ? <div className="loading-box">주문 내역을 불러오는 중...</div> : (
        <div className="orders-market-list">
          {filteredEntries.map((entry) => {
            if (entry.kind === 'order') {
              const { order, summary } = entry
              const items = order.items || []
              const status = order.order_status || summary.order_status
              const hasReturnableDeliveredItem = items.some(
                (item) => item.item_status === 'DELIVERED'
                  && getRemainingQuantity(item, claimedQuantityMap) > 0,
              )
              const action = hasReturnableDeliveredItem
                ? {
                    label: '환불/반품 신청',
                    to: `/refunds?mode=return&orderId=${summary.order_id}`,
                    className: '',
                  }
                : requestAction(status, summary.order_id)
              const itemStatusSet = [...new Set(items.map((item) => item.item_status).filter(Boolean))]
              const hasItemStatusDifference = itemStatusSet.length > 1
                || (itemStatusSet.length === 1 && itemStatusSet[0] !== status)

              return (
                <section className="orders-market-card" key={entry.key}>
                  <div className="orders-market-card-head">
                    <strong>{formatOrderDate(order.ordered_at || summary.ordered_at)}</strong>
                    <Link to={`/orders/${summary.order_id}`}>주문 상세보기 <ChevronRight size={17} /></Link>
                  </div>

                  <div className="orders-market-card-body">
                    <div className="orders-market-products">
                      <div className="orders-market-status">
                        <strong>{statusLabel(ORDER_STATUS_LABELS, status)}</strong>
                        {hasItemStatusDifference ? (
                          <span>상품별 처리 상태가 다릅니다. 각 상품의 상태를 확인해주세요.</span>
                        ) : (
                          <>
                            {status === 'DELIVERED' && <span>배송이 완료되었습니다.</span>}
                            {status === 'PAID' && <span>결제가 완료되어 배송 준비를 기다리고 있습니다.</span>}
                            {status === 'COMPLETED' && <span>구매가 확정된 주문입니다.</span>}
                          </>
                        )}
                      </div>

                      {items.length ? items.map((item) => renderProductRow(item, item.display_quantity)) : (
                        <div className="orders-market-product-row compact-order-summary">
                          <div className="orders-market-product-copy"><strong>주문 상품</strong><span>총 {money(order.total_amount || summary.total_amount)}원</span></div>
                        </div>
                      )}
                    </div>

                    <div className="orders-market-actions">
                      {canTrack(status) && (
                        <Link className="order-action-btn primary" to={`/orders/${summary.order_id}/tracking`}><Truck size={16} /> 배송 조회</Link>
                      )}
                      {action && (
                        <Link className={`order-action-btn ${action.className}`} to={action.to}>{action.label}</Link>
                      )}
                      <Link className="order-action-btn" to={`/orders/${summary.order_id}`}>주문 상세보기</Link>
                    </div>
                  </div>
                </section>
              )
            }

            const request = entry.request
            const isRefund = entry.kind === 'refund'
            const requestStatus = isRefund
              ? request.refund_status
              : getEffectiveReturnStatus(request)
            const headline = isRefund ? refundRequestHeadline(requestStatus) : returnRequestHeadline(requestStatus)
            const label = isRefund
              ? statusLabel(REFUND_STATUS_LABELS, requestStatus)
              : statusLabel(RETURN_STATUS_LABELS, requestStatus)
            const orderDate = entry.order?.ordered_at
            const requestItems = request.items || []

            return (
              <section
                className={`orders-market-card request-history-card ${isRefund ? 'is-refund' : 'is-return'} ${!isRefund && requestStatus === 'COMPLETED' ? 'is-completed' : ''}`}
                key={entry.key}
              >
                <div className="orders-market-card-head">
                  <strong>{formatOrderDate(orderDate)}</strong>
                  <Link to={`/orders/${entry.orderId}`}>주문 상세보기 <ChevronRight size={17} /></Link>
                </div>

                <div className="orders-market-card-body">
                  <div className="orders-market-products">
                    <div className="orders-market-status request-history-status">
                      <strong>{headline}</strong>
                      <span>{label} · 신청일 {formatRequestDate(request.requested_at)}</span>
                    </div>

                    {requestItems.map((item) => {
                      const originalItem = (entry.order?.items || []).find(
                        (candidate) => Number(candidate.order_item_id) === Number(item.order_item_id),
                      )
                      const displayItem = {
                        ...originalItem,
                        ...item,
                        product_id: item.product_id || originalItem?.product_id,
                        unit_price: item.unit_price || originalItem?.unit_price,
                        item_amount: item.item_amount || originalItem?.item_amount,
                      }
                      return renderProductRow(
                        displayItem,
                        Number(isRefund ? item.refund_quantity : item.return_quantity),
                      )
                    })}
                  </div>

                  <div className="orders-market-actions">
                    {isRefund ? (
                      <Link className="order-action-btn primary" to={`/refunds/${request.refund_request_id}`}>환불 내역 보기</Link>
                    ) : (
                      <Link className="order-action-btn primary" to={`/returns/${request.return_request_id}`}>반품 내역 보기</Link>
                    )}
                    <Link className="order-action-btn" to={`/orders/${entry.orderId}`}>주문 상세보기</Link>
                  </div>
                </div>
              </section>
            )
          })}

          {!filteredEntries.length && <div className="empty-box"><strong>조건에 맞는 주문이 없습니다.</strong><span>기간, 상태 또는 검색어를 다시 확인해보세요.</span></div>}
        </div>
      )}
    </div>
  )
}
