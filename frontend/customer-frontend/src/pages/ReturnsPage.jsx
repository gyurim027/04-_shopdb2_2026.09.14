import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronRight, PackageCheck, RotateCcw, Truck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import { ORDER_STATUS_LABELS, RETURN_STATUS_LABELS, statusLabel } from '../utils/status'
import {
  buildClaimedQuantityMap,
  getRemainingQuantity,
  hasRemainingItems,
} from '../utils/refundReturn'

const REASONS = [
  { code: 'CHANGE_OF_MIND', label: '단순 변심' },
  { code: 'DEFECTIVE', label: '상품 불량' },
  { code: 'WRONG_ITEM', label: '오배송' },
  { code: 'DESCRIPTION_MISMATCH', label: '상품 설명과 다름' },
  { code: 'DELIVERY_ISSUE', label: '배송 관련 문제' },
  { code: 'OTHER', label: '기타' },
]

const PICKUP_METHODS = [
  { value: 'PICKUP', label: '택배기사 방문 회수' },
  { value: 'SELF_SHIP', label: '직접 발송' },
]

const money = (value) => Number(value || 0).toLocaleString('ko-KR')
const date = (value) => value ? new Date(value).toLocaleString('ko-KR') : '-'

export default function ReturnsPage({ embedded = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [returns, setReturns] = useState([])
  const [orders, setOrders] = useState([])
  const [orderDetails, setOrderDetails] = useState({})
  const [claimedQuantityMap, setClaimedQuantityMap] = useState({})
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '')
  const [order, setOrder] = useState(null)
  const [selected, setSelected] = useState({})
  const [reasonCode, setReasonCode] = useState('CHANGE_OF_MIND')
  const [reasonDetail, setReasonDetail] = useState('')
  const [pickupMethod, setPickupMethod] = useState('PICKUP')
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdRequests, setCreatedRequests] = useState([])

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [returnData, refundData, orderData] = await Promise.all([
        customerApi.getReturns({ size: 100 }),
        customerApi.getRefunds({ size: 100 }),
        customerApi.getOrders({ size: 100 }),
      ])

      const returnList = returnData?.items || []
      const refundList = refundData?.items || []
      const orderList = orderData?.items || []

      const [returnDetails, refundDetails, orderDetailRows] = await Promise.all([
        Promise.all(returnList.map((request) => customerApi.getReturn(request.return_request_id))),
        Promise.all(refundList.map((request) => customerApi.getRefund(request.refund_request_id))),
        Promise.all(orderList.map((summary) => customerApi.getOrder(summary.order_id))),
      ])

      const nextOrderDetails = {}
      orderDetailRows.forEach((detail) => {
        nextOrderDetails[detail.order_id] = detail
      })

      setReturns(returnList)
      setOrders(orderList)
      setOrderDetails(nextOrderDetails)
      setClaimedQuantityMap(buildClaimedQuantityMap(refundDetails, returnDetails))
    } catch (e) {
      setError(e.message || '반품 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const requestedOrderId = searchParams.get('orderId') || ''
    if (requestedOrderId) {
      setOrderId(requestedOrderId)
      setSelected({})
    }
  }, [searchParams])

  const returnableOrders = useMemo(
    () => orders.filter((summary) => {
      const detail = orderDetails[summary.order_id]
      const status = detail?.order_status || summary.order_status
      return status === 'DELIVERED' && hasRemainingItems(detail, claimedQuantityMap)
    }),
    [orders, orderDetails, claimedQuantityMap],
  )

  useEffect(() => {
    if (!orderId || loading) return
    const valid = returnableOrders.some((item) => String(item.order_id) === String(orderId))
    if (!valid) {
      setOrderId('')
      setOrder(null)
      setSelected({})
    }
  }, [orderId, loading, returnableOrders])

  useEffect(() => {
    let active = true

    if (!orderId) {
      setOrder(null)
      setSelected({})
      return undefined
    }

    setOrderLoading(true)
    setError('')

    const cached = orderDetails[Number(orderId)] || orderDetails[orderId]
    const task = cached ? Promise.resolve(cached) : customerApi.getOrder(orderId)

    task
      .then((data) => {
        if (!active) return
        setOrder(data)
        setSelected({})
      })
      .catch((e) => {
        if (!active) return
        setOrder(null)
        setError(e.message || '주문 상세를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setOrderLoading(false)
      })

    return () => { active = false }
  }, [orderId, orderDetails])

  const availableItems = useMemo(
    () => (order?.items || [])
      .map((item) => ({
        ...item,
        remaining_quantity: getRemainingQuantity(item, claimedQuantityMap),
      }))
      .filter((item) => item.remaining_quantity > 0),
    [order, claimedQuantityMap],
  )

  const selectedCount = useMemo(
    () => Object.values(selected).reduce((sum, quantity) => sum + Number(quantity || 0), 0),
    [selected],
  )

  const submit = async (e) => {
    e.preventDefault()

    const items = Object.entries(selected)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([orderItemId, quantity]) => ({
        order_item_id: Number(orderItemId),
        return_quantity: Number(quantity),
      }))

    if (!orderId) {
      setError('반품할 주문을 선택해주세요.')
      return
    }

    if (!items.length) {
      setError('반품할 상품과 수량을 선택해주세요.')
      return
    }

    const invalidQuantity = items.some((row) => {
      const item = availableItems.find((candidate) => Number(candidate.order_item_id) === Number(row.order_item_id))
      return !item || row.return_quantity > item.remaining_quantity
    })

    if (invalidQuantity) {
      setError('반품 가능한 남은 수량을 초과했습니다. 상품 수량을 다시 확인해주세요.')
      return
    }

    if (reasonCode === 'OTHER' && !reasonDetail.trim()) {
      setError('기타 사유의 상세 내용을 입력해주세요.')
      return
    }

    if (!window.confirm(`총 ${selectedCount}개 상품으로 반품을 신청할까요?`)) return

    setSaving(true)
    setError('')

    try {
      const created = await customerApi.createReturn({
        order_id: Number(orderId),
        return_reason_code: reasonCode,
        return_reason_detail: reasonDetail.trim() || null,
        pickup_method: pickupMethod,
        items,
      })

      const requests = Array.isArray(created?.requests)
        ? created.requests
        : created?.return_request_id
          ? [created]
          : []

      if (!requests.length) throw new Error('반품 요청 생성 결과를 확인할 수 없습니다.')

      showToast(`반품 신청 ${requests.length}건이 접수되었습니다.`)

      if (requests.length === 1) {
        navigate(`/returns/${requests[0].return_request_id}`)
        return
      }

      setCreatedRequests(requests)
      setOrderId('')
      setOrder(null)
      setSelected({})
      setReasonDetail('')
      await load()
    } catch (e) {
      setError(e.message || '반품 신청에 실패했습니다.')
      showToast(e.message || '반품 신청에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const content = (
    <>
      {error && (
        <div className="notice error retry-notice">
          {error}
          <button type="button" onClick={() => { setError(''); load() }}><RotateCcw size={14} /> 다시 시도</button>
        </div>
      )}

      {createdRequests.length > 1 && (
        <div className="notice success return-created-notice">
          <div>
            <strong>판매사별 반품 요청 {createdRequests.length}건이 생성되었습니다.</strong>
            <span>각 판매사 상품은 별도의 반품 요청으로 처리됩니다.</span>
          </div>
          <div className="return-created-links">
            {createdRequests.map((item) => (
              <Link key={item.return_request_id} to={`/returns/${item.return_request_id}`}>
                반품 #{item.return_request_id} <ChevronRight size={13} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <form className="panel return-form" onSubmit={submit}>
        <div className="panel-title-row">
          <h3><RotateCcw /> 반품 신청</h3>
          <span>배송완료 상태이며 반품 가능한 수량이 남아있는 주문만 표시됩니다.</span>
        </div>

        <div className="return-step-label"><span>1</span><strong>주문 선택</strong></div>
        <label>
          반품할 주문
          <select
            value={orderId}
            onChange={(e) => { setOrderId(e.target.value); setSelected({}); setError('') }}
            required
          >
            <option value="">주문을 선택하세요</option>
            {returnableOrders.map((item) => (
              <option key={item.order_id} value={item.order_id}>
                {item.order_no} · {statusLabel(ORDER_STATUS_LABELS, item.order_status)} · {money(item.total_amount)}원
              </option>
            ))}
          </select>
        </label>

        {!loading && !returnableOrders.length && (
          <div className="return-info-box">
            <AlertCircle size={17} />
            <span>현재 반품 가능한 배송완료 상품이 없습니다. 구매확정된 주문은 반품 신청 목록에 표시하지 않습니다.</span>
          </div>
        )}

        {orderLoading && <div className="loading-box compact-return-loading">주문상품을 불러오는 중...</div>}

        {availableItems.length > 0 && (
          <>
            <div className="return-step-label"><span>2</span><strong>반품 상품 및 수량</strong></div>
            <div className="return-item-list">
              {availableItems.map((item) => {
                const ordered = Number(item.quantity || 0)
                const claimed = Math.max(0, ordered - item.remaining_quantity)

                return (
                  <div className="return-item-row" key={item.order_item_id}>
                    <div>
                      <strong>{item.product_name_snapshot}</strong>
                      <span>
                        {item.sku_snapshot || '기본 옵션'} · 구매수량 {ordered}개
                        {claimed > 0 ? ` · 이미 신청 ${claimed}개` : ''}
                        {' · '}신청가능 {item.remaining_quantity}개 · {money(item.item_amount)}원
                      </span>
                    </div>
                    <label>
                      반품수량
                      <input
                        type="number"
                        min="0"
                        max={item.remaining_quantity}
                        value={selected[item.order_item_id] || 0}
                        onChange={(e) => {
                          const next = Math.max(0, Math.min(item.remaining_quantity, Number(e.target.value) || 0))
                          setSelected({ ...selected, [item.order_item_id]: next })
                        }}
                      />
                    </label>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {orderId && !orderLoading && order && !availableItems.length && (
          <div className="return-info-box">
            <AlertCircle size={17} />
            <span>이 주문에는 추가로 반품 신청할 수 있는 수량이 없습니다.</span>
          </div>
        )}

        {order && availableItems.length > 0 && (
          <>
            <div className="return-step-label"><span>3</span><strong>반품 사유와 회수 방법</strong></div>
            <div className="return-option-grid">
              <label>
                반품 사유
                <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                  {REASONS.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
                </select>
              </label>
              <label>
                회수 방법
                <select value={pickupMethod} onChange={(e) => setPickupMethod(e.target.value)}>
                  {PICKUP_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </label>
            </div>
            <label>
              상세 사유
              <textarea
                rows={4}
                maxLength={1000}
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder={reasonCode === 'OTHER' ? '반품 사유를 입력해주세요.' : '필요한 경우 자세한 사유를 입력해주세요.'}
                required={reasonCode === 'OTHER'}
              />
            </label>

            <div className="return-method-note">
              <Truck size={18} />
              <div>
                <strong>{pickupMethod === 'PICKUP' ? '택배기사 방문 회수' : '직접 발송'}</strong>
                <span>{pickupMethod === 'PICKUP' ? '관리자 처리 후 회수 진행 상태를 확인할 수 있습니다.' : '직접 발송 후 운송장 정보는 처리 과정에서 확인할 수 있습니다.'}</span>
              </div>
            </div>

            <button className="btn btn-primary return-submit-btn" disabled={saving || selectedCount < 1}>
              {saving ? '반품 신청 중...' : `반품 ${selectedCount || 0}개 신청하기`}
            </button>
          </>
        )}
      </form>

      <div className="return-list-head">
        <div>
          <span>MY RETURNS</span>
          <h2>내 반품 요청</h2>
        </div>
        <button type="button" className="small-btn" onClick={load}><RotateCcw size={14} /> 새로고침</button>
      </div>

      {loading ? (
        <div className="loading-box">반품 내역을 불러오는 중...</div>
      ) : (
        <div className="return-card-list">
          {returns.map((item) => (
            <Link className="return-card" key={item.return_request_id} to={`/returns/${item.return_request_id}`}>
              <div className="return-card-icon"><PackageCheck size={22} /></div>
              <div className="return-card-main">
                <div className="return-card-topline">
                  <strong>{item.order_no}</strong>
                  <span className={`status-pill return-status-${String(item.return_status || '').toLowerCase()}`}>
                    {statusLabel(RETURN_STATUS_LABELS, item.return_status)}
                  </span>
                </div>
                <span>반품번호 #{item.return_request_id} · {date(item.requested_at)}</span>
                <small>{REASONS.find((reason) => reason.code === item.return_reason_code)?.label || item.return_reason_code}</small>
              </div>
              <span className="return-card-detail-link">상세보기 <ChevronRight size={18} /></span>
            </Link>
          ))}
          {!returns.length && (
            <div className="empty-box">
              <strong>반품 요청 내역이 없습니다.</strong>
              <span>배송완료 상품을 반품하려면 위 양식에서 신청해주세요.</span>
            </div>
          )}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className="returns-page refund-return-embedded">{content}</div>
  }

  return (
    <div className="container page-section returns-page">
      <div className="page-title">
        <span>RETURN</span>
        <h1>반품 신청</h1>
        <p>배송완료 상품의 반품을 신청하고 진행 상태를 확인하세요.</p>
      </div>
      {content}
    </div>
  )
}
