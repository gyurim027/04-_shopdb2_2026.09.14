import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  ClipboardCheck,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { REFUND_STATUS_LABELS, statusLabel } from '../utils/status'

const REFUND_STEPS = [
  { key: 'REQUESTED', label: '환불접수', icon: CircleDot },
  { key: 'REVIEWING', label: '환불검토', icon: ClipboardCheck },
  { key: 'APPROVED', label: '환불승인', icon: RefreshCcw },
  { key: 'COMPLETED', label: '환불완료', icon: CheckCircle2 },
]

const STATUS_ORDER = {
  REQUESTED: 1,
  REVIEWING: 2,
  APPROVED: 3,
  COMPLETED: 4,
}

const money = (value) => Number(value || 0).toLocaleString('ko-KR')
const date = (value) => value ? new Date(value).toLocaleString('ko-KR') : '-'

function parseRefundReason(value) {
  const text = String(value || '').trim()
  if (!text) {
    return {
      category: '사유 정보 없음',
      detail: '상세 사유 없음',
    }
  }

  const separator = ' - '
  const index = text.indexOf(separator)

  if (index < 0) {
    return {
      category: text,
      detail: '상세 사유 없음',
    }
  }

  return {
    category: text.slice(0, index).trim() || '사유 정보 없음',
    detail: text.slice(index + separator.length).trim() || '상세 사유 없음',
  }
}

export default function RefundDetailPage() {
  const { refundRequestId } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await customerApi.getRefund(refundRequestId)
      setDetail(data)
    } catch (e) {
      setError(e.message || '환불 상세 정보를 불러오지 못했습니다.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refundRequestId])

  const currentStatus = detail?.refund_status
  const currentStep = useMemo(
    () => STATUS_ORDER[currentStatus] || 0,
    [currentStatus],
  )
  const isStopped = ['REJECTED', 'CANCELLED'].includes(currentStatus)
  const reason = useMemo(
    () => parseRefundReason(detail?.refund_reason),
    [detail?.refund_reason],
  )

  if (loading) {
    return (
      <div className="container page-section">
        <div className="loading-box">환불 상세 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="container page-section">
        <div className="notice error retry-notice">
          {error || '환불 정보를 찾을 수 없습니다.'}
          <button type="button" onClick={load}>
            <RotateCcw size={14} /> 다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container page-section refund-detail-page">
      <Link className="back-link" to="/refunds">
        <ChevronLeft size={16} /> 환불 목록으로
      </Link>

      <div className="page-title return-detail-title">
        <span>REFUND DETAIL</span>
        <h1>환불 #{detail.refund_request_id}</h1>
        <p>
          {detail.order_no} · <b>{statusLabel(REFUND_STATUS_LABELS, currentStatus)}</b>
        </p>
      </div>

      {error && <div className="notice error">{error}</div>}

      {isStopped ? (
        <div className="notice error return-stop-notice">
          현재 환불 상태는 <strong>{statusLabel(REFUND_STATUS_LABELS, currentStatus)}</strong>입니다.
        </div>
      ) : (
        <div className="return-progress" aria-label="환불 진행 단계">
          {REFUND_STEPS.map((step, index) => {
            const StepIcon = step.icon
            const stepNumber = index + 1
            const state = currentStep > stepNumber
              ? 'done'
              : currentStep === stepNumber
                ? 'active'
                : ''

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
          <div className="panel-title-row">
            <h3><RefreshCcw /> 환불 신청 정보</h3>
            <span>#{detail.refund_request_id}</span>
          </div>

          <div className="return-info-grid">
            <div>
              <span>현재 상태</span>
              <b>{statusLabel(REFUND_STATUS_LABELS, currentStatus)}</b>
            </div>
            <div>
              <span>신청일시</span>
              <b>{date(detail.requested_at)}</b>
            </div>
            <div>
              <span>선택한 환불 사유</span>
              <b>{reason.category}</b>
            </div>
            <div>
              <span>환불 정책 번호</span>
              <b>{detail.refund_policy_id ? `#${detail.refund_policy_id}` : '-'}</b>
            </div>
            <div className="full">
              <span>상세 사유</span>
              <b>{reason.detail}</b>
            </div>
          </div>
        </section>

        <section className="panel return-date-panel">
          <div className="panel-title-row">
            <h3><RefreshCcw /> 환불 금액 / 처리 일정</h3>
            <button type="button" className="small-btn" onClick={load}>
              <RotateCcw size={13} /> 새로고침
            </button>
          </div>

          <div className="return-date-list">
            <div><span>요청 금액</span><b>{money(detail.requested_amount)}원</b></div>
            <div><span>승인 금액</span><b>{detail.approved_amount == null ? '-' : `${money(detail.approved_amount)}원`}</b></div>
            <div><span>환불 신청</span><b>{date(detail.requested_at)}</b></div>
            <div><span>환불 승인</span><b>{date(detail.approved_at)}</b></div>
            <div><span>환불 완료</span><b>{date(detail.completed_at)}</b></div>
          </div>
        </section>
      </div>

      <section className="panel return-products-panel">
        <div className="panel-title-row">
          <h3><PackageCheck /> 환불 신청 상품</h3>
          <span>{detail.items?.length || 0}개 항목</span>
        </div>

        <div className="return-detail-items">
          {(detail.items || []).map((item) => (
            <div className="return-detail-item" key={item.refund_item_id}>
              <div>
                <strong>{item.product_name_snapshot}</strong>
                <span>{item.sku_snapshot || '기본 옵션'}</span>
              </div>

              <div className="return-item-meta">
                <span>주문수량 <b>{item.ordered_quantity}</b></span>
                <span>환불수량 <b>{item.refund_quantity}</b></span>
                <span>상품단가 <b>{money(item.unit_price)}원</b></span>
                <span>환불금액 <b>{money(item.refund_amount)}원</b></span>
              </div>
            </div>
          ))}

          {!detail.items?.length && (
            <div className="empty-box compact-refund-detail-empty">
              <strong>환불 상품 정보가 없습니다.</strong>
            </div>
          )}
        </div>
      </section>

      <div className="return-detail-actions">
        <Link className="btn btn-light" to={`/orders/${detail.order_id}`}>
          주문 상세보기
        </Link>
        <Link className="btn btn-primary" to="/refunds">
          환불 목록으로
        </Link>
      </div>
    </div>
  )
}
