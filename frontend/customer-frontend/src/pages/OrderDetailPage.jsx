import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ImageOff,
  MapPin,
  PackageCheck,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import { useToast } from '../context/ToastContext'
import { ORDER_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')
const date = (v) => v ? new Date(v).toLocaleString('ko-KR') : '-'

const STEP_KEYS = [
  { key: 'order', label: '주문완료', icon: PackageCheck },
  { key: 'payment', label: '결제완료', icon: CreditCard },
  { key: 'shipping', label: '배송진행', icon: Truck },
  { key: 'done', label: '처리완료', icon: CheckCircle2 },
]

function statusStep(status = '') {
  if (['DELIVERED', 'COMPLETED', 'REFUNDED'].includes(status)) return 4
  if (['PREPARING', 'SHIPPING', 'SHIPPED', 'IN_TRANSIT'].includes(status)) return 3
  if (['PAID'].includes(status)) return 2
  return 1
}

function productImageFromDetail(product) {
  if (!product) return null
  if (product.main_image_url) return resolveMediaUrl(product.main_image_url)

  const images = Array.isArray(product.images) ? product.images : []
  const main = images.find((image) => image.image_type === 'MAIN') || images[0]
  return resolveMediaUrl(main?.public_url || main?.thumbnail_url)
}

function OrderProductThumb({ src, name }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="order-line-thumb order-line-thumb-fallback" aria-label="상품 이미지 없음">
        <ImageOff size={20} />
      </div>
    )
  }

  return (
    <div className="order-line-thumb order-line-thumb-image">
      <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
    </div>
  )
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [productMeta, setProductMeta] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    setProductMeta({})

    try {
      const nextOrder = await customerApi.getOrder(orderId)
      setOrder(nextOrder)

      const productIds = [...new Set(
        (nextOrder.items || [])
          .map((item) => Number(item.product_id))
          .filter((id) => Number.isFinite(id) && id > 0),
      )]

      if (productIds.length) {
        const results = await Promise.allSettled(
          productIds.map(async (productId) => {
            const product = await customerApi.getProduct(productId)
            return [productId, product]
          }),
        )

        const nextProductMeta = {}
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const [productId, product] = result.value
            nextProductMeta[productId] = product
          }
        })
        setProductMeta(nextProductMeta)
      }
    } catch (e) {
      setError(e.message || '주문 정보를 불러오지 못했습니다.')
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

  const canPay = order ? !['PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.order_status) : false
  const currentStep = useMemo(() => statusStep(order?.order_status), [order?.order_status])

  if (loading) return <div className="container page-section"><div className="loading-box">주문정보를 불러오는 중...</div></div>
  if (!order) return <div className="container page-section"><div className="notice error retry-notice">{error || '주문 정보를 찾을 수 없습니다.'}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div></div>

  return (
    <div className="container page-section order-detail-page">
      <div className="page-title order-detail-title">
        <span>ORDER DETAIL</span>
        <h1>{order.order_no}</h1>
        <p>{date(order.ordered_at)} · <b>{statusLabel(ORDER_STATUS_LABELS, order.order_status)}</b></p>
      </div>

      {params.get('pay') === '1' && canPay && <div className="notice info">주문이 생성되었습니다. 아래 결제영역에서 Mock 카드결제를 진행해주세요.</div>}
      {error && <div className="notice error">{error}</div>}
      {payment && <div className="notice success">결제가 완료되었습니다. 결제번호 #{payment.payment_id}</div>}

      <div className="order-stepper" aria-label="주문 진행 단계">
        {STEP_KEYS.map((step, index) => {
          const StepIcon = step.icon
          const number = index + 1
          const state = currentStep > number ? 'done' : currentStep === number ? 'active' : ''
          return (
            <div key={step.key} className={`order-step ${state}`}>
              <div className="order-step-icon"><StepIcon size={19} /></div>
              <div><span>STEP {number}</span><strong>{step.label}</strong></div>
            </div>
          )
        })}
      </div>

      <div className="detail-panels order-detail-panels">
        <section className="panel order-products-panel">
          <div className="panel-title-row"><h3><PackageCheck /> 주문상품</h3><span>{order.items?.length || 0}개 상품</span></div>
          {order.items?.map((item) => {
            const product = productMeta[Number(item.product_id)]
            const itemImage = resolveMediaUrl(item.main_image_url || item.thumbnail_url) || productImageFromDetail(product)
            const productPath = item.product_id ? `/products/${item.product_id}` : null

            const content = (
              <>
                <OrderProductThumb src={itemImage} name={item.product_name_snapshot} />
                <div className="order-line-copy">
                  <strong>{item.product_name_snapshot}</strong>
                  <span>{item.sku_snapshot || '기본 옵션'} · {item.quantity}개</span>
                  {productPath && <em className="order-product-link-hint">상품 상세보기 <ChevronRight size={13} /></em>}
                </div>
              </>
            )

            return (
              <div className="line-item order-line-item" key={item.order_item_id}>
                {productPath ? (
                  <Link className="order-product-link" to={productPath} aria-label={`${item.product_name_snapshot} 상품 상세보기`}>
                    {content}
                  </Link>
                ) : (
                  <div className="order-product-link is-disabled">{content}</div>
                )}
                <b className="order-line-price">{money(item.item_amount)}원</b>
              </div>
            )
          })}
        </section>

        <section className="panel shipping-panel">
          <div className="panel-title-row shipping-title-row"><h3><MapPin /> 배송정보</h3><Link className="detail-tracking-link" to={`/orders/${order.order_id}/tracking`}><Truck size={15} /> 배송 조회</Link></div>
          <div className="shipping-info-grid">
            <div><span>받는 사람</span><b>{order.receiver_name || '-'}</b></div>
            <div><span>연락처</span><b>{order.receiver_phone || '-'}</b></div>
            <div className="full"><span>배송지</span><b>[{order.zipcode || '-'}] {order.shipping_address1 || ''} {order.shipping_address2 || ''}</b></div>
          </div>
        </section>

        <section className="panel payment-panel">
          <h3><CreditCard /> 결제금액</h3>
          <div><span>상품금액</span><b>{money(order.product_amount)}원</b></div>
          <div><span>배송비</span><b>{money(order.shipping_amount)}원</b></div>
          <div className="total-line"><span>총 결제금액</span><strong>{money(order.total_amount)}원</strong></div>
          {canPay ? (
            <button className="btn btn-primary full payment-cta" onClick={pay} disabled={busy}>{busy ? '결제 처리 중...' : 'Mock 카드결제 진행'}</button>
          ) : (
            <div className="paid-mark"><CheckCircle2 size={17} /> 결제 또는 주문 처리가 완료된 상태입니다.</div>
          )}
          <Link className="refund-guide-link" to="/refunds">환불이 필요하신가요? 환불 요청으로 이동</Link>
        </section>
      </div>
    </div>
  )
}
