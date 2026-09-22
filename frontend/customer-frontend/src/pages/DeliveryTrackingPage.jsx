import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  PackageCheck,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { ORDER_STATUS_LABELS, statusLabel } from '../utils/status'

const dateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR')
}

function deliveryMeta(status = '') {
  if (['DELIVERED', 'COMPLETED'].includes(status)) {
    return { title: '배송완료', message: '고객님이 주문하신 상품의 배송이 완료되었습니다.', tone: 'done' }
  }
  if (['SHIPPING', 'SHIPPED', 'IN_TRANSIT'].includes(status)) {
    return { title: '배송중', message: '고객님이 주문하신 상품이 배송 중입니다.', tone: 'shipping' }
  }
  if (status === 'PREPARING') {
    return { title: '상품 준비중', message: '판매자가 상품을 준비하고 있습니다.', tone: 'preparing' }
  }
  if (status === 'PAID') {
    return { title: '결제완료', message: '결제가 완료되었습니다. 배송 준비가 시작되면 배송정보가 표시됩니다.', tone: 'paid' }
  }
  if (status === 'CANCELLED') {
    return { title: '주문취소', message: '취소된 주문입니다.', tone: 'cancelled' }
  }
  if (status === 'REFUNDED') {
    return { title: '환불완료', message: '환불 처리가 완료된 주문입니다.', tone: 'cancelled' }
  }
  return { title: statusLabel(ORDER_STATUS_LABELS, status), message: '주문 처리 상태를 확인하고 있습니다.', tone: 'preparing' }
}

function getTrackingNumber(order) {
  return order?.tracking_number
    || order?.shipment?.tracking_number
    || order?.shipping?.tracking_number
    || order?.delivery?.tracking_number
    || null
}

function getCarrier(order) {
  return order?.carrier_name
    || order?.shipment?.carrier_name
    || order?.shipping?.carrier_name
    || order?.delivery?.carrier_name
    || null
}

const FAQS = [
  ['상품이 일부만 배송되었어요.', '상품이 여러 개라면 판매자 또는 출고지에 따라 나누어 배송될 수 있습니다. 주문 상세에서 상품별 상태를 확인해주세요.'],
  ['반품 신청을 했는데 언제 처리되나요?', '반품/환불 메뉴에서 현재 요청 상태를 확인할 수 있습니다. 실제 처리 기간은 판매자 확인 과정에 따라 달라질 수 있습니다.'],
  ['배송완료인데 상품을 받지 못했어요.', '배송기사 또는 배송사에 먼저 확인하고, 해결되지 않으면 고객센터에 문의해주세요.'],
  ['환불/반품하고 싶어요.', '주문목록의 환불/반품 신청 버튼 또는 상단 환불/반품 메뉴를 이용해주세요.'],
]

export default function DeliveryTrackingPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setOrder(await customerApi.getOrder(orderId))
    } catch (e) {
      setError(e.message || '배송 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orderId])

  const meta = useMemo(() => deliveryMeta(order?.order_status), [order?.order_status])
  const trackingNumber = getTrackingNumber(order)
  const carrier = getCarrier(order)
  const statusTime = order?.updated_at || order?.ordered_at

  if (loading) return <div className="container page-section"><div className="loading-box">배송 정보를 불러오는 중...</div></div>
  if (!order) return <div className="container page-section"><div className="notice error retry-notice">{error || '배송 정보를 찾을 수 없습니다.'}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div></div>

  return (
    <div className="container page-section delivery-tracking-page">
      <Link className="tracking-back-link" to="/orders"><ArrowLeft size={16} /> 주문목록으로</Link>
      <h1>배송 조회</h1>

      <section className={`tracking-hero ${meta.tone}`}>
        <strong>{meta.title}</strong>
        <p>{meta.message}</p>
      </section>

      <section className="tracking-summary-grid">
        <div className="tracking-carrier-card">
          <div className="tracking-carrier-icon"><Truck size={31} /></div>
          <div>
            <span>배송사</span>
            <strong>{carrier || '배송사 정보 미등록'}</strong>
            <dl>
              <div><dt>송장번호</dt><dd>{trackingNumber || '아직 등록되지 않았습니다.'}</dd></div>
              <div><dt>주문고유번호</dt><dd>{order.order_no || `#${order.order_id}`}</dd></div>
            </dl>
          </div>
        </div>

        <div className="tracking-recipient-card">
          <h3><MapPin size={19} /> 배송지 정보</h3>
          <dl>
            <div><dt>받는사람</dt><dd>{order.receiver_name || '-'}</dd></div>
            <div><dt>연락처</dt><dd>{order.receiver_phone || '-'}</dd></div>
            <div><dt>받는주소</dt><dd>[{order.zipcode || '-'}] {order.shipping_address1 || ''} {order.shipping_address2 || ''}</dd></div>
          </dl>
        </div>
      </section>

      <section className="tracking-history-card">
        <div className="tracking-history-head">
          <span>시간</span><span>현재위치</span><span>배송상태</span>
        </div>
        <div className="tracking-history-row">
          <span>{dateTime(statusTime)}</span>
          <span>{carrier ? carrier : '-'}</span>
          <strong>{statusLabel(ORDER_STATUS_LABELS, order.order_status)}</strong>
        </div>
        {!trackingNumber && <div className="tracking-empty-note"><PackageCheck size={17} /> 송장번호가 등록되면 이동 경로를 더 자세히 표시할 수 있습니다.</div>}
      </section>

      <section className="tracking-faq">
        <h2>배송에 대해 궁금한 점이 있으십니까?</h2>
        {FAQS.map(([question, answer], index) => (
          <div className="tracking-faq-item" key={question}>
            <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
              <span><b>Q</b>{question}</span>
              {openFaq === index ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
            </button>
            {openFaq === index && <p>{answer}</p>}
          </div>
        ))}
      </section>
    </div>
  )
}
