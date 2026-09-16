import { useEffect, useState } from 'react'
import { CreditCard, MapPin, PackageCheck } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
const money = (v) => Number(v || 0).toLocaleString('ko-KR')
export default function OrderDetailPage() {
  const { orderId } = useParams(); const [params] = useSearchParams(); const [order, setOrder] = useState(null); const [payment, setPayment] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { customerApi.getOrder(orderId).then(setOrder).catch((e) => setError(e.message)) }, [orderId])
  const pay = async () => { setBusy(true); setError(''); try { const req = await customerApi.requestPayment({ order_id: Number(orderId), pg_provider: 'TOSS', payment_method: 'CARD' }); const approved = await customerApi.approvePayment(req.payment_id, { payment_key: `mock_${Date.now()}`, amount: Number(req.requested_amount), pg_transaction_id: `TX_${Date.now()}`, receipt_url: null }); setPayment(approved); setOrder(await customerApi.getOrder(orderId)) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  if (!order) return <div className="container page-section">{error ? <div className="notice error">{error}</div> : <div className="loading-box">주문정보를 불러오는 중...</div>}</div>
  const canPay = !['PAID', 'COMPLETED', 'CANCELLED'].includes(order.order_status)
  return <div className="container page-section"><div className="page-title"><span>ORDER DETAIL</span><h1>{order.order_no}</h1><p>주문 상태: <b>{order.order_status}</b></p></div>{params.get('pay') === '1' && canPay && <div className="notice info">주문이 생성되었습니다. 아래에서 Mock 결제를 진행해주세요.</div>}{error && <div className="notice error">{error}</div>}{payment && <div className="notice success">결제가 완료되었습니다. 결제번호 #{payment.payment_id}</div>}
    <div className="detail-panels"><section className="panel"><h3><PackageCheck /> 주문상품</h3>{order.items.map((i) => <div className="line-item" key={i.order_item_id}><div><strong>{i.product_name_snapshot}</strong><span>{i.sku_snapshot || '기본 옵션'} · {i.quantity}개</span></div><b>{money(i.item_amount)}원</b></div>)}</section><section className="panel"><h3><MapPin /> 배송정보</h3><p><b>{order.receiver_name || '-'}</b> · {order.receiver_phone || '-'}</p><p>[{order.zipcode || '-'}] {order.shipping_address1 || ''} {order.shipping_address2 || ''}</p></section><section className="panel payment-panel"><h3><CreditCard /> 결제금액</h3><div><span>상품금액</span><b>{money(order.product_amount)}원</b></div><div><span>배송비</span><b>{money(order.shipping_amount)}원</b></div><div className="total-line"><span>총 결제금액</span><strong>{money(order.total_amount)}원</strong></div>{canPay ? <button className="btn btn-primary full" onClick={pay} disabled={busy}>{busy ? '결제 처리 중...' : 'Mock 카드결제 진행'}</button> : <div className="paid-mark">결제/처리 완료 상태입니다.</div>}</section></div>
  </div>
}
