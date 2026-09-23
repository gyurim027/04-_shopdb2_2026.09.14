import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  ClipboardCheck,
  PackageCheck,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { RETURN_STATUS_LABELS, statusLabel } from '../utils/status'
import { getEffectiveReturnStatus } from '../utils/refundReturn'

const RETURN_STEPS = [
  { key: 'REQUESTED', label: '반품접수', icon: CircleDot },
  { key: 'APPROVED', label: '반품승인', icon: ClipboardCheck },
  { key: 'PICKUP_REQUESTED', label: '회수진행', icon: Truck },
  { key: 'RECEIVED', label: '상품입고', icon: Box },
  { key: 'INSPECTING', label: '상품검수', icon: PackageCheck },
  { key: 'COMPLETED', label: '반품완료', icon: CheckCircle2 },
]

const STATUS_ORDER = {
  REQUESTED: 1,
  APPROVED: 2,
  PICKUP_REQUESTED: 3,
  PICKED_UP: 3,
  RECEIVED: 4,
  INSPECTING: 5,
  COMPLETED: 6,
}

const REASON_LABELS = {
  CHANGE_OF_MIND: '단순 변심',
  DEFECTIVE: '상품 불량',
  WRONG_ITEM: '오배송',
  DESCRIPTION_MISMATCH: '상품 설명과 다름',
  DELIVERY_ISSUE: '배송 관련 문제',
  OTHER: '기타',
}

const PICKUP_LABELS = {
  PICKUP: '택배기사 방문 회수',
  SELF_SHIP: '직접 발송',
}

const INSPECTION_LABELS = {
  PENDING: '검수대기',
  APPROVED: '검수승인',
  REJECTED: '검수거절',
}

const date = (value) => value ? new Date(value).toLocaleString('ko-KR') : '-'

export default function ReturnDetailPage() {
  const { returnRequestId } = useParams()
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [detailData, statusData] = await Promise.all([
        customerApi.getReturn(returnRequestId),
        customerApi.getReturnStatus(returnRequestId),
      ])
      setDetail(detailData)
      setStatus(statusData)
    } catch (e) {
      setError(e.message || '반품 상세 정보를 불러오지 못했습니다.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(() => {
      load({ silent: true })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [returnRequestId])

  const liveReturn = useMemo(() => ({
    ...(detail || {}),
    ...(status || {}),
    return_status: status?.return_status || detail?.return_status,
    requested_at: status?.requested_at || detail?.requested_at,
    pickup_at: status?.pickup_at || detail?.pickup_at,
    received_at: status?.received_at || detail?.received_at,
    inspected_at: status?.inspected_at || detail?.inspected_at,
    completed_at: status?.completed_at || detail?.completed_at,
    carrier_name: status?.carrier_name || detail?.carrier_name,
    tracking_no: status?.tracking_no || detail?.tracking_no,
    refund_request_id: status?.refund_request_id || detail?.refund_request_id,
  }), [detail, status])

  const rawStatus = status?.return_status || detail?.return_status
  const currentStatus = useMemo(() => getEffectiveReturnStatus(liveReturn), [liveReturn])
  const currentStep = useMemo(() => STATUS_ORDER[currentStatus] || 0, [currentStatus])
  const isStopped = ['REJECTED', 'CANCELLED'].includes(rawStatus)

  if (loading) {
    return <div className="container page-section"><div className="loading-box">반품 상세 정보를 불러오는 중...</div></div>
  }

  if (!detail) {
    return (
      <div className="container page-section">
        <div className="notice error retry-notice">{error || '반품 정보를 찾을 수 없습니다.'}<button type="button" onClick={() => load({ silent: true })}><RotateCcw size={14} /> 다시 시도</button></div>
      </div>
    )
  }

  return (
    <div className="container page-section return-detail-page">
      <Link className="back-link" to="/refunds?mode=return"><ChevronLeft size={16} /> 반품 목록으로</Link>

      <div className="page-title return-detail-title">
        <span>RETURN DETAIL</span>
        <h1>반품 #{detail.return_request_id}</h1>
        <p>{detail.order_no} · <b>{statusLabel(RETURN_STATUS_LABELS, currentStatus)}</b></p>
      </div>

      {error && <div className="notice error">{error}</div>}

      {isStopped ? (
        <div className="notice error return-stop-notice">
          현재 반품 상태는 <strong>{statusLabel(RETURN_STATUS_LABELS, currentStatus)}</strong>입니다.
        </div>
      ) : (
        <div className="return-progress" aria-label="반품 진행 단계">
          {RETURN_STEPS.map((step, index) => {
            const StepIcon = step.icon
            const stepNumber = index + 1
            const state = currentStep > stepNumber ? 'done' : currentStep === stepNumber ? 'active' : ''
            return (
              <div className={`return-progress-step ${state}`} key={step.key}>
                <div className="return-progress-icon"><StepIcon size={18} /></div>
                <span>STEP {stepNumber}</span>
                <strong>{step.label}</strong>
              </div>
            )
          })}
        </div>
      )}

      <div className="return-detail-grid">
        <section className="panel return-summary-panel">
          <div className="panel-title-row"><h3><RotateCcw /> 반품 정보</h3><span>#{detail.return_request_id}</span></div>
          <div className="return-info-grid">
            <div><span>현재 상태</span><b>{statusLabel(RETURN_STATUS_LABELS, currentStatus)}</b></div>
            <div><span>신청일시</span><b>{date(liveReturn.requested_at)}</b></div>
            <div><span>반품 사유</span><b>{REASON_LABELS[detail.return_reason_code] || detail.return_reason_code}</b></div>
            <div><span>회수 방법</span><b>{PICKUP_LABELS[detail.pickup_method] || detail.pickup_method}</b></div>
            <div className="full"><span>상세 사유</span><b>{detail.return_reason_detail || '상세 사유 없음'}</b></div>
            <div><span>택배사</span><b>{liveReturn.carrier_name || '-'}</b></div>
            <div><span>운송장번호</span><b>{liveReturn.tracking_no || '-'}</b></div>
          </div>
        </section>

        <section className="panel return-date-panel">
          <div className="panel-title-row"><h3><Truck /> 처리 일정</h3><button type="button" className="small-btn" onClick={() => load({ silent: true })}><RotateCcw size={13} /> 새로고침</button></div>
          <div className="return-date-list">
            <div><span>반품 신청</span><b>{date(liveReturn.requested_at)}</b></div>
            <div><span>회수 완료</span><b>{date(liveReturn.pickup_at)}</b></div>
            <div><span>상품 입고</span><b>{date(liveReturn.received_at)}</b></div>
            <div><span>검수 처리</span><b>{date(liveReturn.inspected_at)}</b></div>
            <div><span>반품 완료</span><b>{date(liveReturn.completed_at)}</b></div>
            <div><span>연결된 환불번호</span><b>{liveReturn.refund_request_id ? `#${liveReturn.refund_request_id}` : '-'}</b></div>
          </div>
        </section>
      </div>

      <section className="panel return-products-panel">
        <div className="panel-title-row"><h3><PackageCheck /> 반품 상품</h3><span>{detail.items?.length || 0}개 항목</span></div>
        <div className="return-detail-items">
          {detail.items?.map((item) => (
            <div className="return-detail-item" key={item.return_item_id}>
              <div>
                <strong>{item.product_name_snapshot}</strong>
                <span>{item.sku_snapshot || '기본 옵션'}</span>
              </div>
              <div className="return-item-meta">
                <span>주문수량 <b>{item.ordered_quantity}</b></span>
                <span>반품수량 <b>{item.return_quantity}</b></span>
                <span>검수상태 <b>{INSPECTION_LABELS[item.inspection_result] || item.inspection_result}</b></span>
              </div>
              {item.inspection_note && <p>{item.inspection_note}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="return-detail-actions">
        <Link className="btn btn-light" to={`/orders/${detail.order_id}`}>주문 상세보기</Link>
        <Link className="btn btn-primary" to="/refunds?mode=return">반품 목록으로</Link>
      </div>
    </div>
  )
}
