import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ImageOff, RotateCcw, Search, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import { ORDER_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')

function formatOrderDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 주문`
}

function productImageFromDetail(product) {
  if (!product) return null
  if (product.main_image_url) return resolveMediaUrl(product.main_image_url)
  const images = Array.isArray(product.images) ? product.images : []
  const main = images.find((image) => image.image_type === 'MAIN') || images[0]
  return resolveMediaUrl(main?.public_url || main?.thumbnail_url)
}

function statusGroup(status = '') {
  if (['READY', 'CREATED', 'ORDERED', 'PENDING', 'PENDING_PAYMENT'].includes(status)) return 'PAYMENT'
  if (status === 'PAID') return 'PAID'
  if (['PREPARING', 'SHIPPING', 'SHIPPED', 'IN_TRANSIT'].includes(status)) return 'SHIPPING'
  if (['DELIVERED', 'COMPLETED', 'REFUNDED', 'CANCELLED'].includes(status)) return 'DONE'
  return 'OTHER'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [period, setPeriod] = useState('6M')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, index) => String(currentYear - index))

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await customerApi.getOrders({ size: 100 })
      const list = result?.items || []
      setOrders(list)

      const detailResults = await Promise.allSettled(
        list.map(async (order) => [order.order_id, await customerApi.getOrder(order.order_id)]),
      )

      const nextDetails = {}
      const productIds = new Set()
      detailResults.forEach((resultItem) => {
        if (resultItem.status !== 'fulfilled') return
        const [orderId, detail] = resultItem.value
        nextDetails[orderId] = detail
        ;(detail?.items || []).forEach((item) => {
          const id = Number(item.product_id)
          if (Number.isFinite(id) && id > 0) productIds.add(id)
        })
      })
      setOrderDetails(nextDetails)

      const productResults = await Promise.allSettled(
        [...productIds].map(async (productId) => [productId, await customerApi.getProduct(productId)]),
      )
      const nextProducts = {}
      productResults.forEach((resultItem) => {
        if (resultItem.status === 'fulfilled') {
          const [productId, product] = resultItem.value
          nextProducts[productId] = product
        }
      })
      setProductMeta(nextProducts)
    } catch (e) {
      setError(e.message || '주문 내역을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredOrders = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 6)

    return orders.filter((summary) => {
      const detail = orderDetails[summary.order_id] || summary
      const orderedAt = new Date(detail.ordered_at || summary.ordered_at)
      const periodMatch = period === '6M'
        ? (!Number.isNaN(orderedAt.getTime()) && orderedAt >= sixMonthsAgo)
        : String(orderedAt.getFullYear()) === period

      const group = statusGroup(detail.order_status || summary.order_status)
      const statusMatch = statusFilter === 'ALL' || group === statusFilter

      const productNames = (detail.items || []).map((item) => item.product_name_snapshot || '').join(' ').toLowerCase()
      const orderNo = String(detail.order_no || summary.order_no || '').toLowerCase()
      const keywordMatch = !q || productNames.includes(q) || orderNo.includes(q)
      return periodMatch && statusMatch && keywordMatch
    })
  }, [orders, orderDetails, keyword, period, statusFilter])

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
        </select>
      </div>

      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}

      {loading ? <div className="loading-box">주문 내역을 불러오는 중...</div> : (
        <div className="orders-market-list">
          {filteredOrders.map((summary) => {
            const order = orderDetails[summary.order_id] || summary
            const items = order.items || []
            const status = order.order_status || summary.order_status
            return (
              <section className="orders-market-card" key={summary.order_id}>
                <div className="orders-market-card-head">
                  <strong>{formatOrderDate(order.ordered_at || summary.ordered_at)}</strong>
                  <Link to={`/orders/${summary.order_id}`}>주문 상세보기 <ChevronRight size={17} /></Link>
                </div>

                <div className="orders-market-card-body">
                  <div className="orders-market-products">
                    <div className="orders-market-status">
                      <strong>{statusLabel(ORDER_STATUS_LABELS, status)}</strong>
                      {status === 'DELIVERED' && <span>배송이 완료되었습니다.</span>}
                      {status === 'PAID' && <span>결제가 완료되어 배송 준비를 기다리고 있습니다.</span>}
                    </div>

                    {items.length ? items.map((item) => {
                      const product = productMeta[Number(item.product_id)]
                      const src = resolveMediaUrl(item.main_image_url || item.thumbnail_url) || productImageFromDetail(product)
                      return (
                        <div className="orders-market-product-row" key={item.order_item_id}>
                          <Link to={`/products/${item.product_id}`} className="orders-market-product-link">
                            <OrderThumb src={src} name={item.product_name_snapshot} />
                            <div className="orders-market-product-copy">
                              <strong>{item.product_name_snapshot}</strong>
                              <span>{money(item.unit_price || (Number(item.item_amount || 0) / Math.max(Number(item.quantity || 1), 1)))}원 · {item.quantity}개</span>
                            </div>
                          </Link>
                        </div>
                      )
                    }) : (
                      <div className="orders-market-product-row compact-order-summary">
                        <div className="orders-market-product-copy"><strong>주문 상품</strong><span>총 {money(order.total_amount || summary.total_amount)}원</span></div>
                      </div>
                    )}
                  </div>

                  <div className="orders-market-actions">
                    <Link className="order-action-btn primary" to={`/orders/${summary.order_id}/tracking`}><Truck size={16} /> 배송 조회</Link>
                    <Link className="order-action-btn" to="/refunds">교환, 반품 신청</Link>
                    <Link className="order-action-btn" to={`/orders/${summary.order_id}`}>주문 상세보기</Link>
                  </div>
                </div>
              </section>
            )
          })}

          {!filteredOrders.length && <div className="empty-box"><strong>조건에 맞는 주문이 없습니다.</strong><span>기간, 상태 또는 검색어를 다시 확인해보세요.</span></div>}
        </div>
      )}
    </div>
  )
}
