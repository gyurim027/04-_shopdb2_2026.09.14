import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, FileUp, Headphones, Plus, RotateCcw, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'
import { INQUIRY_STATUS_LABELS, statusLabel } from '../utils/status'

const initialForm = { category_code: 'PRODUCT', title: '', content: '', secret_yn: 'N' }
const CATEGORY_LABELS = { PRODUCT: '상품', DELIVERY: '배송', PAYMENT: '결제', REFUND: '환불', ETC: '기타' }

export default function SupportPage() {
  const { showToast } = useToast()
  const [inquiries, setInquiries] = useState([])
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [keyword, setKeyword] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await customerApi.getInquiries({ size: 100 })
      setInquiries(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setInquiries([])
      setError(e.message || '문의 내역을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return inquiries.filter((item) => {
      const answered = Boolean(item.has_answer || item.answer_content)
      const statusMatch = statusFilter === 'ALL' || (statusFilter === 'ANSWERED' ? answered : !answered)
      const categoryMatch = categoryFilter === 'ALL' || item.category_code === categoryFilter
      const keywordMatch = !q || String(item.title || '').toLowerCase().includes(q) || String(item.content || '').toLowerCase().includes(q)
      return statusMatch && categoryMatch && keywordMatch
    })
  }, [inquiries, statusFilter, categoryFilter, keyword])

  const submit = async (e) => {
    e.preventDefault()
    if (file && file.size > 10 * 1024 * 1024) {
      setError('첨부파일은 최대 10MB까지 업로드할 수 있습니다.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const inquiry = await customerApi.createInquiry(form)
      if (file && inquiry?.inquiry_id) await customerApi.uploadInquiryFile(inquiry.inquiry_id, file)
      setForm(initialForm)
      setFile(null)
      setOpen(false)
      await load()
      showToast('문의가 정상적으로 접수되었습니다.')
    } catch (e) {
      setError(e.message || '문의를 등록하지 못했습니다.')
      showToast(e.message || '문의 등록에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="page-title row-title">
        <div><span>HELP CENTER</span><h1>고객센터</h1><p>상품, 배송, 결제, 환불 문의를 한곳에서 관리하세요.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen((prev) => !prev)}>{open ? <X size={18} /> : <Plus size={18} />}{open ? '문의 닫기' : '1:1 문의하기'}</button>
      </div>

      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}

      <div className="support-hero enhanced-support-hero">
        <Headphones />
        <div><strong>빠른 도움이 필요하신가요?</strong><span>AI 도우미에게 먼저 물어보거나 회사 정책을 확인해보세요.</span></div>
        <div className="support-hero-actions"><Link to="/ai">AI 도우미</Link><Link to="/policies">정책 보기</Link></div>
      </div>

      {open && (
        <form className="panel form-stack support-form" onSubmit={submit}>
          <div className="panel-title-row"><h3>1:1 문의 작성</h3><span>답변이 등록되면 문의 상세에서 확인할 수 있어요.</span></div>
          <label>문의 유형<select value={form.category_code} onChange={(e) => setForm((prev) => ({ ...prev, category_code: e.target.value }))}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>제목<input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} maxLength={200} placeholder="문의 제목을 입력해주세요" required /></label>
          <label>내용<textarea value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} rows={6} placeholder="문의 내용을 자세히 입력해주세요" required /></label>
          <label className="file-field"><FileUp />첨부파일 (최대 10MB)<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
          {file && <div className="selected-file">선택된 파일: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</div>}
          <label className="checkbox-row"><input type="checkbox" checked={form.secret_yn === 'Y'} onChange={(e) => setForm((prev) => ({ ...prev, secret_yn: e.target.checked ? 'Y' : 'N' }))} />비밀 문의</label>
          <button className="btn btn-primary" disabled={saving}>{saving ? '등록 중...' : '문의 등록'}</button>
        </form>
      )}

      <div className="support-list-head">
        <div><h2 className="subheading">내 문의 내역</h2><span>총 {inquiries.length}건</span></div>
        <label className="support-search"><Search size={16} /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="문의 제목 검색" /></label>
      </div>

      <div className="support-filters">
        <div className="filter-chip-row">
          {[['ALL', '전체'], ['WAITING', '답변 대기'], ['ANSWERED', '답변 완료']].map(([value, label]) => <button type="button" key={value} className={statusFilter === value ? 'active' : ''} onClick={() => setStatusFilter(value)}>{label}</button>)}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="ALL">전체 문의유형</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {loading ? <div className="loading-box">문의 내역을 불러오는 중...</div> : (
        <div className="inquiry-list">
          {filtered.map((q) => (
            <Link key={q.inquiry_id} to={`/support/${q.inquiry_id}`} className="inquiry-card inquiry-card-link" aria-label={`${q.title || '문의'} 상세 보기`}>
              <div><span className="category-tag">{CATEGORY_LABELS[q.category_code] || q.category_code || '기타'}</span><strong>{q.title || '제목 없음'}</strong><span>{q.created_at ? new Date(q.created_at).toLocaleString('ko-KR') : ''}</span></div>
              <div className="inquiry-card-action"><span className={`status-pill ${q.has_answer ? 'done' : ''}`}>{q.has_answer ? '답변완료' : statusLabel(INQUIRY_STATUS_LABELS, q.inquiry_status || 'RECEIVED')}</span><ChevronRight size={19} /></div>
            </Link>
          ))}
          {!filtered.length && <div className="empty-box"><strong>조건에 맞는 문의가 없습니다.</strong><span>필터를 변경하거나 새 문의를 등록해보세요.</span></div>}
        </div>
      )}
    </div>
  )
}
