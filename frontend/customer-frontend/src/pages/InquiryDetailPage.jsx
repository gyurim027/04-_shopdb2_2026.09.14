import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  Paperclip,
  ShieldCheck,
} from 'lucide-react'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'

const CATEGORY_LABELS = {
  PRODUCT: '상품',
  DELIVERY: '배송',
  PAYMENT: '결제',
  REFUND: '환불',
  ETC: '기타',
}

const STATUS_LABELS = {
  RECEIVED: '접수완료',
  IN_PROGRESS: '처리중',
  ANSWERED: '답변완료',
  COMPLETED: '답변완료',
  CLOSED: '종료',
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function InquiryDetailPage() {
  const { inquiryId } = useParams()
  const [inquiry, setInquiry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await customerApi.getInquiry(inquiryId)
        if (active) setInquiry(data)
      } catch (e) {
        if (active) setError(e.message || '문의 내용을 불러오지 못했습니다.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [inquiryId])

  if (loading) {
    return (
      <div className="container page-section">
        <div className="loading-box">문의 상세 내용을 불러오는 중...</div>
      </div>
    )
  }

  if (error || !inquiry) {
    return (
      <div className="container page-section">
        <Link to="/support" className="back-link"><ArrowLeft size={16} /> 고객센터로 돌아가기</Link>
        <div className="notice error">{error || '문의 정보를 찾을 수 없습니다.'}</div>
      </div>
    )
  }

  const status = inquiry.answer_content
    ? 'ANSWERED'
    : (inquiry.inquiry_status || 'RECEIVED')

  return (
    <div className="container page-section inquiry-detail-page">
      <Link to="/support" className="back-link">
        <ArrowLeft size={16} /> 내 문의 내역으로
      </Link>

      <div className="inquiry-detail-heading">
        <div>
          <span className="category-tag">
            {CATEGORY_LABELS[inquiry.category_code] || inquiry.category_code || '기타'}
          </span>
          {inquiry.secret_yn === 'Y' && (
            <span className="secret-badge"><ShieldCheck size={13} /> 비밀 문의</span>
          )}
          <h1>{inquiry.title || '제목 없음'}</h1>
          <div className="inquiry-detail-meta">
            <span><Clock3 size={14} /> {formatDate(inquiry.created_at)}</span>
            <span>문의번호 #{inquiry.inquiry_id}</span>
          </div>
        </div>

        <span className={`status-pill detail-status ${inquiry.answer_content ? 'done' : ''}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      <section className="inquiry-detail-card">
        <div className="inquiry-section-title">
          <MessageSquareText size={20} />
          <div>
            <strong>내가 문의한 내용</strong>
            <span>등록한 문의 내용을 확인할 수 있습니다.</span>
          </div>
        </div>
        <div className="inquiry-content-box">{inquiry.content || '문의 내용이 없습니다.'}</div>

        {!!inquiry.files?.length && (
          <div className="inquiry-files">
            <div className="inquiry-files-title"><Paperclip size={16} /> 첨부파일</div>
            {inquiry.files.map((file) => {
              const url = resolveMediaUrl(file.public_url)
              const content = (
                <>
                  <FileText size={18} />
                  <div>
                    <strong>{file.original_file_name || `첨부파일 ${file.file_id}`}</strong>
                    <span>{[file.file_type, formatFileSize(file.file_size)].filter(Boolean).join(' · ')}</span>
                  </div>
                </>
              )

              return url ? (
                <a key={file.inquiry_file_id || file.file_id} className="inquiry-file-row" href={url} target="_blank" rel="noreferrer">
                  {content}
                </a>
              ) : (
                <div key={file.inquiry_file_id || file.file_id} className="inquiry-file-row disabled">
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className={`inquiry-answer-card ${inquiry.answer_content ? 'answered' : ''}`}>
        <div className="inquiry-section-title">
          {inquiry.answer_content ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
          <div>
            <strong>{inquiry.answer_content ? '고객센터 답변' : '답변 대기 중'}</strong>
            <span>
              {inquiry.answer_content
                ? `답변일 ${formatDate(inquiry.answered_at)}`
                : '담당자가 문의를 확인한 뒤 답변드릴 예정입니다.'}
            </span>
          </div>
        </div>

        {inquiry.answer_content ? (
          <div className="inquiry-answer-content">{inquiry.answer_content}</div>
        ) : (
          <div className="inquiry-answer-waiting">
            문의가 정상적으로 접수되었습니다. 답변이 등록되면 이 화면에서 확인할 수 있습니다.
          </div>
        )}
      </section>
    </div>
  )
}
