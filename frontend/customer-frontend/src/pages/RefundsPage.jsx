import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronRight, RefreshCcw, RotateCcw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import {
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  statusLabel,
} from '../utils/status'
import {
  buildClaimedQuantityMap,
  getRemainingQuantity,
  hasRemainingItems,
} from '../utils/refundReturn'
import ReturnsPage from './ReturnsPage'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')
const REASONS = ['단순 변심', '상품 불량', '오배송', '상품 설명과 다름', '배송 지연', '기타']
const REFUNDABLE_ORDER_STATUSES = new Set([
  'PAID',
  'PREPARING',
  'SHIPPING',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
])

export default function RefundsPage() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'return' ? 'return' : 'refund'
  const requestedOrderId = searchParams.get('orderId') || ''

  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [orderDetails, setOrderDetails] = useState({})
  const [claimedQuantityMap, setClaimedQuantityMap] = useState({})
  const [orderId, setOrderId] = useState(requestedOrderId)
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
      const [refundData, returnData, orderData] = await Promise.all([
        customerApi.getRefunds({ size: 100 }),
        customerApi.getReturns({ size: 100 }),
        customerApi.getOrders({ size: 100 }),
      ])

      const refundList = refundData?.items || []
      const returnList = returnData?.items || []
      const orderList = orderData?.items || []

      const [refundDetails, returnDetails, orderDetailRows] = await Promise.all([
        Promise.all(refundList.map((request) => customerApi.getRefund(request.refund_request_id))),
        Promise.all(returnList.map((request) => customerApi.getReturn(request.return_request_id))),
        Promise.all(orderList.map((order) => customerApi.getOrder(order.order_id))),
      ])

      const nextOrderDetails = {}
      orderDetailRows.forEach((order) => {
        nextOrderDetails[order.order_id] = order
      })

      setItems(refundList)
      setOrders(orderList)
      setOrderDetails(nextOrderDetails)
      setClaimedQuantityMap(buildClaimedQuantityMap(refundDetails, returnDetails))
    } catch (e) {
      setError(e.message || '환불 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'refund') load()
  }, [mode])

  useEffect(() => {
    if (mode === 'refund' && requestedOrderId) {
      setOrderId(requestedOrderId)
      setSelected({})
    }
  }, [mode, requestedOrderId])

  const refundableOrders = useMemo(
    () => orders.filter((summary) => {
      const detailRow = orderDetails[summary.order_id]
      const status = detailRow?.order_status || summary.order_status
      return REFUNDABLE_ORDER_STATUSES.has(status) && hasRemainingItems(detailRow, claimedQuantityMap)
    }),
    [orders, orderDetails, claimedQuantityMap],
  )

  useEffect(() => {
    if (mode !== 'refund' || !orderId || loading) return
    const valid = refundableOrders.some((item) => String(item.order_id) === String(orderId))
    if (!valid) {
      setOrderId('')
      setDetail(null)
      setPolicy(null)
      setSelected({})
    }
  }, [mode, orderId, loading, refundableOrders])

  useEffect(() => {
    let active = true

    if (mode !== 'refund' || !orderId) {
      setDetail(null)
      setPolicy(null)
      return undefined
    }

    const cachedDetail = orderDetails[Number(orderId)] || orderDetails[orderId]
    if (cachedDetail) setDetail(cachedDetail)

    Promise.allSettled([
      cachedDetail ? Promise.resolve(cachedDetail) : customerApi.getOrder(orderId),
      customerApi.getRefundPolicy(orderId),
    ]).then(([orderResult, policyResult]) => {
      if (!active) return
      setDetail(orderResult.status === 'fulfilled' ? orderResult.value : null)
      setPolicy(policyResult.status === 'fulfilled' ? policyResult.value : null)
    })

    return () => { active = false }
  }, [mode, orderId, orderDetails])

  const availableItems = useMemo(
    () => (detail?.items || [])
      .map((item) => ({
        ...item,
        remaining_quantity: getRemainingQuantity(item, claimedQuantityMap),
      }))
      .filter((item) => item.remaining_quantity > 0),
    [detail, claimedQuantityMap],
  )

  const changeMode = (nextMode) => {
    const next = new URLSearchParams(searchParams)
    if (nextMode === 'return') next.set('mode', 'return')
    else next.delete('mode')
    setSearchParams(next)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()

    const refundItems = Object.entries(selected)
      .filter(([, q]) => Number(q) > 0)
      .map(([id, q]) => ({ order_item_id: Number(id), refund_quantity: Number(q) }))

    if (!refundItems.length) {
      setError('환불할 상품 수량을 선택해주세요.')
      return
    }

    const invalidQuantity = refundItems.some((row) => {
      const item = availableItems.find((candidate) => Number(candidate.order_item_id) === Number(row.order_item_id))
      return !item || row.refund_quantity > item.remaining_quantity
    })

    if (invalidQuantity) {
      setError('환불 가능한 남은 수량을 초과했습니다. 상품 수량을 다시 확인해주세요.')
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
      setDetail(null)
      await load()
      showToast('환불 요청이 접수되었습니다.')
    } catch (e) {
      setError(e.message || '환불 요청에 실패했습니다.')
      showToast(e.message || '환불 요청에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container page-section refund-return-page">
      <div className="page-title refund-return-page-title">
        <span>REFUND / RETURN</span>
        <h1>환불/반품</h1>
        <p>원하는 처리 방법을 선택해 환불 또는 반품을 신청하고 진행 상태를 확인하세요.</p>
      </div>

      <div className="refund-return-tabs" role="tablist" aria-label="환불 또는 반품 선택">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'refund'}
          className={`refund-return-tab ${mode === 'refund' ? 'active' : ''}`}
          onClick={() => changeMode('refund')}
        >
          <RefreshCcw size={18} />
          <span><strong>환불</strong><small>결제 금액 환불 요청</small></span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'return'}
          className={`refund-return-tab ${mode === 'return' ? 'active' : ''}`}
          onClick={() => changeMode('return')}
        >
          <RotateCcw size={18} />
          <span><strong>반품</strong><small>배송받은 상품 회수 요청</small></span>
        </button>
      </div>

      {mode === 'return' ? (
        <ReturnsPage embedded />
      ) : (
        <>
          {error && (
            <div className="notice error retry-notice">
              {error}
              <button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button>
            </div>
          )}

          <form className="panel refund-form enhanced-refund-form" onSubmit={submit}>
            <div className="panel-title-row"><h3><RefreshCcw /> 환불 요청</h3><span>단계별로 선택해주세요.</span></div>

            <div className="refund-step-label"><span>1</span><strong>주문 선택</strong></div>
            <label>주문 선택
              <select value={orderId} onChange={(e) => { setOrderId(e.target.value); setSelected({}); setError('') }} required>
                <option value="">주문을 선택하세요</option>
                {refundableOrders.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_no} · {statusLabel(ORDER_STATUS_LABELS, o.order_status)} · {money(o.total_amount)}원
                  </option>
                ))}
              </select>
            </label>

            {!loading && !refundableOrders.length && (
              <div className="return-info-box">
                <AlertCircle size={17} />
                <span>현재 환불 또는 주문취소를 신청할 수 있는 남은 상품이 없습니다.</span>
              </div>
            )}

            {policy && <div className="policy-mini enhanced-policy"><AlertCircle size={17} /><div><b>{policy.policy_name}</b><span>환불 가능 기간: {policy.allowed_days}일 · 배송비 부담: {policy.shipping_fee_payer}</span></div></div>}

            {availableItems.length > 0 && <div className="refund-step-label"><span>2</span><strong>환불 상품 및 수량</strong></div>}
            {availableItems.map((i) => {
              const ordered = Number(i.quantity || 0)
              const claimed = Math.max(0, ordered - i.remaining_quantity)
              return (
                <div className="refund-item" key={i.order_item_id}>
                  <div>
                    <strong>{i.product_name_snapshot}</strong>
                    <span>
                      구매수량 {ordered}개
                      {claimed > 0 ? ` · 이미 신청 ${claimed}개` : ''}
                      {' · '}신청가능 {i.remaining_quantity}개 · {money(i.item_amount)}원
                    </span>
                  </div>
                  <label className="refund-qty-label">
                    환불수량
                    <input
                      type="number"
                      min="0"
                      max={i.remaining_quantity}
                      value={selected[i.order_item_id] || 0}
                      onChange={(e) => {
                        const next = Math.max(0, Math.min(i.remaining_quantity, Number(e.target.value) || 0))
                        setSelected({ ...selected, [i.order_item_id]: next })
                      }}
                    />
                  </label>
                </div>
              )
            })}

            {orderId && !loading && detail && !availableItems.length && (
              <div className="return-info-box">
                <AlertCircle size={17} />
                <span>이 주문에는 추가로 환불 신청할 수 있는 수량이 없습니다.</span>
              </div>
            )}

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
            <button className="btn btn-primary" disabled={saving || !orderId || !availableItems.length}>{saving ? '요청 중...' : '환불 요청하기'}</button>
          </form>

          <h2 className="subheading">내 환불 요청</h2>
          {loading ? <div className="loading-box">환불 내역을 불러오는 중...</div> : (
            <div className="refund-list">
              {items.map((r) => (
                <Link
                  className="refund-card refund-card-link"
                  key={r.refund_request_id}
                  to={`/refunds/${r.refund_request_id}`}
                >
                  <div>
                    <strong>#{r.refund_request_id} · {r.order_no}</strong>
                    <span>{r.refund_reason || '환불 요청'}</span>
                  </div>
                  <div className="refund-card-right">
                    <span className="status-pill">{statusLabel(REFUND_STATUS_LABELS, r.refund_status)}</span>
                    <b>{money(r.requested_amount)}원</b>
                    <span className="refund-card-detail-link">상세보기 <ChevronRight size={14} /></span>
                  </div>
                </Link>
              ))}
              {!items.length && <div className="empty-box"><strong>환불 요청 내역이 없습니다.</strong><span>환불이 필요한 주문이 있다면 위 양식에서 요청해주세요.</span></div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
