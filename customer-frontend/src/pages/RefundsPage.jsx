import { useEffect, useState } from 'react'
import { RefreshCcw, RotateCcw } from 'lucide-react'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import { REFUND_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')

export default function RefundsPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
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

    setSaving(true)
    setError('')
    try {
      await customerApi.createRefund({ order_id: Number(orderId), refund_reason: reason, items: refundItems })
      setReason('')
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

      <form className="panel refund-form" onSubmit={submit}>
        <h3><RefreshCcw /> 환불 요청</h3>
        <label>주문 선택<select value={orderId} onChange={(e) => { setOrderId(e.target.value); setSelected({}); setError('') }} required><option value="">주문을 선택하세요</option>{orders.map((o) => <option key={o.order_id} value={o.order_id}>{o.order_no} · {o.order_status} · {money(o.total_amount)}원</option>)}</select></label>
        {policy && <div className="policy-mini"><b>{policy.policy_name}</b><span>환불 가능 기간: {policy.allowed_days}일 · 배송비 부담: {policy.shipping_fee_payer}</span></div>}
        {detail?.items?.map((i) => (
          <div className="refund-item" key={i.order_item_id}>
            <div><strong>{i.product_name_snapshot}</strong><span>구매수량 {i.quantity}개 · {money(i.item_amount)}원</span></div>
            <input type="number" min="0" max={i.quantity} value={selected[i.order_item_id] || 0} onChange={(e) => setSelected({ ...selected, [i.order_item_id]: e.target.value })} />
          </div>
        ))}
        <label>환불 사유<textarea value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} rows={4} placeholder="환불 사유를 입력해주세요" /></label>
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
          {!items.length && <div className="empty-box">환불 요청 내역이 없습니다.</div>}
        </div>
      )}
    </div>
  )
}
