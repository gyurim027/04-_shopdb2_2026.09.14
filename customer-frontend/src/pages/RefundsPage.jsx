import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCcw, RotateCcw } from 'lucide-react'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import { REFUND_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')
const REASONS = ['단순 변심', '상품 불량', '오배송', '상품 설명과 다름', '배송 지연', '기타']

export default function RefundsPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [orderId, setOrderId] = useState('')
  const [reasonType, setReasonType] = useState('단순 변심')
  const [reasonDetail, setReasonDetail] = useState('')
  const [selected, setSelected] = useState({})
  const [detail, setDetail] = useState(null)
  const [policy, setPolicy] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [refundData, orderData] = await Promise.all([
        customerApi.getRefunds(),
        customerApi.getOrders({ size: 100 }),
      ])
      setItems(refundData?.items || [])
      setOrders(orderData?.items || [])
    } catch (e) {
      setError(e.message || '환불 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let active = true
    if (!orderId) {
      setDetail(null)
      setPolicy(null)
      return undefined
    }

    Promise.allSettled([
      customerApi.getOrder(orderId),
      customerApi.getRefundPolicy(orderId),
    ]).then(([orderResult, policyResult]) => {
      if (!active) return
      setDetail(orderResult.status === 'fulfilled' ? orderResult.value : null)
      setPolicy(policyResult.status === 'fulfilled' ? policyResult.value : null)
    })

    return () => { active = false }
  }, [orderId])

  const submit = async (e) => {
    e.preventDefault()
    const refundItems = Object.entries(selected)
      .filter(([, q]) => Number(q) > 0)
      .map(([id, q]) => ({ order_item_id: Number(id), refund_quantity: Number(q) }))

    if (!refundItems.length) {
      setError('환불할 상품 수량을 선택해주세요.')
      return
    }

    const reason = reasonType === '기타'
      ? reasonDetail.trim()
      : `${reasonType}${reasonDetail.trim() ? ` - ${reasonDetail.trim()}` : ''}`

    if (!reason) {
      setError('환불 사유를 입력해주세요.')
      return
    }

    if (!window.confirm('선택한 상품으로 환불 요청을 접수할까요?')) return

    setSaving(true)
    setError('')
    try {
      await customerApi.createRefund({ order_id: Number(orderId), refund_reason: reason, items: refundItems })
      setReasonType('단순 변심')
      setReasonDetail('')
      setSelected({})
      setOrderId('')
      await load()
      showToast('환불 요청이 접수되었습니다.')
    } catch (e) {
      setError(e.message)
      showToast(e.message || '환불 요청에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="page-title"><span>REFUND</span><h1>취소/환불</h1><p>구매한 상품의 환불을 요청하고 처리 상태를 확인하세요.</p></div>
      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}

      <form className="panel refund-form enhanced-refund-form" onSubmit={submit}>
        <div className="panel-title-row"><h3><RefreshCcw /> 환불 요청</h3><span>단계별로 선택해주세요.</span></div>

        <div className="refund-step-label"><span>1</span><strong>주문 선택</strong></div>
        <label>주문 선택
          <select value={orderId} onChange={(e) => { setOrderId(e.target.value); setSelected({}); setError('') }} required>
            <option value="">주문을 선택하세요</option>
            {orders.map((o) => <option key={o.order_id} value={o.order_id}>{o.order_no} · {o.order_status} · {money(o.total_amount)}원</option>)}
          </select>
        </label>

        {policy && <div className="policy-mini enhanced-policy"><AlertCircle size={17} /><div><b>{policy.policy_name}</b><span>환불 가능 기간: {policy.allowed_days}일 · 배송비 부담: {policy.shipping_fee_payer}</span></div></div>}

        {detail?.items?.length > 0 && <div className="refund-step-label"><span>2</span><strong>환불 상품 및 수량</strong></div>}
        {detail?.items?.map((i) => (
          <div className="refund-item" key={i.order_item_id}>
            <div><strong>{i.product_name_snapshot}</strong><span>구매수량 {i.quantity}개 · {money(i.item_amount)}원</span></div>
            <label className="refund-qty-label">환불수량<input type="number" min="0" max={i.quantity} value={selected[i.order_item_id] || 0} onChange={(e) => setSelected({ ...selected, [i.order_item_id]: e.target.value })} /></label>
          </div>
        ))}

        {orderId && <div className="refund-step-label"><span>3</span><strong>환불 사유</strong></div>}
        <div className="refund-reason-grid">
          <label>사유 선택
            <select value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
              {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </label>
          <label>상세 내용
            <textarea value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} maxLength={450} rows={4} placeholder={reasonType === '기타' ? '환불 사유를 입력해주세요.' : '필요한 경우 자세한 내용을 입력해주세요.'} required={reasonType === '기타'} />
          </label>
        </div>
        <button className="btn btn-primary" disabled={saving || !orderId}>{saving ? '요청 중...' : '환불 요청하기'}</button>
      </form>

      <h2 className="subheading">내 환불 요청</h2>
      {loading ? <div className="loading-box">환불 내역을 불러오는 중...</div> : (
        <div className="refund-list">
          {items.map((r) => (
            <article className="refund-card" key={r.refund_request_id}>
              <div><strong>#{r.refund_request_id} · {r.order_no}</strong><span>{r.refund_reason || '환불 요청'}</span></div>
              <div><span className="status-pill">{statusLabel(REFUND_STATUS_LABELS, r.refund_status)}</span><b>{money(r.requested_amount)}원</b></div>
            </article>
          ))}
          {!items.length && <div className="empty-box"><strong>환불 요청 내역이 없습니다.</strong><span>환불이 필요한 주문이 있다면 위 양식에서 요청해주세요.</span></div>}
        </div>
      )}
    </div>
  )
}
