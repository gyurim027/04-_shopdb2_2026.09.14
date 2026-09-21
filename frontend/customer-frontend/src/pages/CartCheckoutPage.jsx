import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  PackageCheck,
  RotateCcw,
  ShoppingCart,
  Store,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import { ORDER_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (value) => Number(value || 0).toLocaleString('ko-KR')

function readStoredOrders() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('shopdb2_cart_checkout_orders') || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function CartCheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const seedOrders = location.state?.createdOrders || readStoredOrders()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingOrderId, setPayingOrderId] = useState(null)
  const [payingAll, setPayingAll] = useState(false)
  const [error, setError] = useState(location.state?.partialError || '')

  const loadOrders = async () => {
    if (!seedOrders.length) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const details = await Promise.all(
        seedOrders.map(async (seed) => {
          const order = await customerApi.getOrder(seed.order_id)
          return { ...seed, ...order }
        }),
      )
      setOrders(details)
    } catch (e) {
      setError(e.message || '생성된 주문 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  const unpaidOrders = useMemo(
    () => orders.filter((order) => !['PAID', 'COMPLETED', 'DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.order_status)),
    [orders],
  )

  const totalAmount = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [orders],
  )

  const payOne = async (order) => {
    setPayingOrderId(order.order_id)
    setError('')
    try {
      const request = await customerApi.requestPayment({
        order_id: Number(order.order_id),
        pg_provider: 'TOSS',
        payment_method: 'CARD',
      })
      await customerApi.approvePayment(request.payment_id, {
        payment_key: `cart_mock_${order.order_id}_${Date.now()}`,
        amount: Number(request.requested_amount),
        pg_transaction_id: `CART_TX_${order.order_id}_${Date.now()}`,
        receipt_url: null,
      })

      const cartItemIds = Array.isArray(order.cart_item_ids) ? order.cart_item_ids : []
      if (cartItemIds.length) {
        await Promise.allSettled(
          cartItemIds.map((cartItemId) => customerApi.deleteCartItem(cartItemId)),
        )
      }

      const updated = await customerApi.getOrder(order.order_id)
      setOrders((prev) => prev.map((row) => row.order_id === order.order_id ? { ...row, ...updated } : row))
      window.dispatchEvent(new CustomEvent('shopdb2:cart-updated'))
      showToast(`${order.order_no} 결제가 완료되었습니다.`)
      return true
    } catch (e) {
      setError(e.message || `${order.order_no} 결제에 실패했습니다.`)
      showToast(e.message || '결제 처리에 실패했습니다.', 'error')
      return false
    } finally {
      setPayingOrderId(null)
    }
  }

  const payAll = async () => {
    if (!unpaidOrders.length) return
    if (!window.confirm(`미결제 주문 ${unpaidOrders.length}건을 순서대로 Mock 카드결제할까요?`)) return

    setPayingAll(true)
    setError('')
    let allSucceeded = true

    for (const order of unpaidOrders) {
      const ok = await payOne(order)
      if (!ok) {
        allSucceeded = false
        break
      }
    }

    setPayingAll(false)
    if (allSucceeded) {
      sessionStorage.removeItem('shopdb2_cart_checkout_orders')
      window.dispatchEvent(new CustomEvent('shopdb2:cart-updated'))
      showToast('선택한 판매사 주문 결제가 모두 완료되었습니다.')
    }
  }

  const allPaid = orders.length > 0 && unpaidOrders.length === 0

  if (loading) {
    return <div className="container page-section"><div className="loading-box">판매사별 주문을 확인하는 중...</div></div>
  }

  if (!orders.length) {
    return (
      <div className="container page-section cart-checkout-page">
        <div className="cart-empty panel">
          <ShoppingCart size={42} />
          <strong>결제할 장바구니 주문이 없습니다.</strong>
          <span>장바구니에서 상품을 선택하고 주문을 생성해주세요.</span>
          <Link className="btn btn-primary" to="/cart">장바구니로 이동</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container page-section cart-checkout-page">
      <div className="page-title">
        <span>CART CHECKOUT</span>
        <h1>판매사별 주문 결제</h1>
        <p>장바구니 상품은 판매사별 주문으로 생성됩니다. 각 주문을 결제하면 해당 상품이 장바구니에서 자동으로 빠집니다.</p>
      </div>

      {error && (
        <div className="notice error retry-notice">
          {error}
          <button type="button" onClick={() => setError('')}><RotateCcw size={14} /> 닫기</button>
        </div>
      )}

      {allPaid && (
        <div className="notice success cart-all-paid-notice">
          <CheckCircle2 size={18} /> 모든 장바구니 주문의 결제가 완료되었습니다.
        </div>
      )}

      <div className="cart-checkout-layout">
        <section className="cart-checkout-orders">
          {orders.map((order) => {
            const paid = ['PAID', 'COMPLETED', 'DELIVERED', 'REFUNDED'].includes(order.order_status)
            const paying = payingOrderId === order.order_id

            return (
              <article className="cart-checkout-order" key={order.order_id}>
                <div className="cart-checkout-order-head">
                  <div className="cart-checkout-seller">
                    <Store size={18} />
                    <div><strong>{order.seller_name || `판매사 #${order.org_id}`}</strong><span>{order.order_no}</span></div>
                  </div>
                  <span className={`status-pill ${paid ? 'success' : ''}`}>{statusLabel(ORDER_STATUS_LABELS, order.order_status)}</span>
                </div>

                <div className="cart-checkout-products">
                  {(order.items || []).map((item) => (
                    <div key={item.order_item_id}>
                      <span>{item.product_name_snapshot}</span>
                      <small>{item.sku_snapshot || '기본 옵션'} · {item.quantity}개</small>
                      <b>{money(item.item_amount)}원</b>
                    </div>
                  ))}
                </div>

                <div className="cart-checkout-order-foot">
                  <strong>{money(order.total_amount)}원</strong>
                  <div>
                    <Link className="small-btn" to={`/orders/${order.order_id}`}>주문 상세 <ChevronRight size={13} /></Link>
                    {!paid && order.order_status !== 'CANCELLED' && (
                      <button type="button" className="btn btn-primary compact-pay-button" onClick={() => payOne(order)} disabled={paying || payingAll}>
                        <CreditCard size={16} /> {paying ? '결제 중...' : '이 주문 결제'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <aside className="cart-checkout-summary">
          <div className="cart-summary-title"><PackageCheck size={19} /><strong>결제 요약</strong></div>
          <div className="cart-summary-line"><span>생성 주문</span><b>{orders.length}건</b></div>
          <div className="cart-summary-line"><span>미결제 주문</span><b>{unpaidOrders.length}건</b></div>
          <div className="cart-summary-total"><span>전체 주문금액</span><strong>{money(totalAmount)}원</strong></div>

          {unpaidOrders.length ? (
            <button type="button" className="btn btn-primary cart-checkout-button" onClick={payAll} disabled={payingAll || payingOrderId !== null}>
              <CreditCard size={17} /> {payingAll ? '순차 결제 중...' : `미결제 ${unpaidOrders.length}건 전체 Mock 결제`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary cart-checkout-button" onClick={() => navigate('/orders')}>
              주문목록으로 이동
            </button>
          )}

          <Link className="cart-summary-link" to="/cart">장바구니 다시 보기</Link>
          <p>한 주문의 결제가 실패하면 이후 주문의 자동 결제는 중단됩니다.</p>
        </aside>
      </div>
    </div>
  )
}
