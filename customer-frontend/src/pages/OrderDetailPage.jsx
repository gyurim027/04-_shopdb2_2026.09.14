import { useEffect, useState } from 'react'
import { CreditCard, MapPin, PackageCheck, RotateCcw } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import { ORDER_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setOrder(await customerApi.getOrder(orderId))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orderId])

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      const req = await customerApi.requestPayment({
        order_id: Number(orderId),
        pg_provider: 'TOSS',
        payment_method: 'CARD',
      })
      const approved = await customerApi.approvePayment(req.payment_id, {
        payment_key: `mock_${Date.now()}`,
        amount: Number(req.requested_amount),
        pg_transaction_id: `TX_${Date.now()}`,
        receipt_url: null,
      })
      setPayment(approved)
      setOrder(await customerApi.getOrder(orderId))
      showToast('Mock 카드결제가 완료되었습니다.')
    } catch (e) {
      setError(e.message)
      showToast(e.message || '결제 처리에 실패했습니다.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="container page-section"><div className="loading-box">주문정보를 불러오는 중...</div></div>
  if (!order) return <div className="container page-section"><div className="notice error retry-notice">{error || '주문 정보를 찾을 수 없습니다.'}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div></div>

  const canPay = !['PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.order_status)

  return (
    <div className="container page-section">
      <div className="page-title">
        <span>ORDER DETAIL</span>
        <h1>{order.order_no}</h1>
        <p>주문 상태: <b>{statusLabel(ORDER_STATUS_LABELS, order.order_status)}</b></p>
      </div>

      {params.get('pay') === '1' && canPay && <div className="notice info">주문이 생성되었습니다. 아래에서 Mock 결제를 진행해주세요.</div>}
      {error && <div className="notice error">{error}</div>}
      {payment && <div className="notice success">결제가 완료되었습니다. 결제번호 #{payment.payment_id}</div>}

      <div className="checkout-progress" aria-label="주문 진행 단계">
        <div className="done"><span>1</span><b>주문 생성</b></div>
        <div className={!canPay ? 'done' : 'active'}><span>2</span><b>결제</b></div>
        <div className={['PAID', 'PREPARING', 'SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.order_status) ? 'active' : ''}><span>3</span><b>배송 준비</b></div>
      </div>

      <div className="detail-panels">
        <section className="panel">
          <h3><PackageCheck /> 주문상품</h3>
          {order.items.map((i) => (
            <div className="line-item" key={i.order_item_id}>
              <div><strong>{i.product_name_snapshot}</strong><span>{i.sku_snapshot || '기본 옵션'} · {i.quantity}개</span></div>
              <b>{money(i.item_amount)}원</b>
            </div>
          ))}
        </section>

        <section className="panel">
          <h3><MapPin /> 배송정보</h3>
          <p><b>{order.receiver_name || '-'}</b> · {order.receiver_phone || '-'}</p>
          <p>[{order.zipcode || '-'}] {order.shipping_address1 || ''} {order.shipping_address2 || ''}</p>
        </section>

        <section className="panel payment-panel">
          <h3><CreditCard /> 결제금액</h3>
          <div><span>상품금액</span><b>{money(order.product_amount)}원</b></div>
          <div><span>배송비</span><b>{money(order.shipping_amount)}원</b></div>
          <div className="total-line"><span>총 결제금액</span><strong>{money(order.total_amount)}원</strong></div>
          {canPay ? (
            <button className="btn btn-primary full" onClick={pay} disabled={busy}>{busy ? '결제 처리 중...' : 'Mock 카드결제 진행'}</button>
          ) : (
            <div className="paid-mark">결제/처리 완료 상태입니다.</div>
          )}
        </section>
      </div>
    </div>
  )
}
