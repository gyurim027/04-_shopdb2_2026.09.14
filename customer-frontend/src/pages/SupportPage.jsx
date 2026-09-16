import { useEffect, useState } from 'react'
import { ChevronRight, FileUp, Headphones, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'

const initialForm = {
  category_code: 'PRODUCT',
  title: '',
  content: '',
  secret_yn: 'N',
}

export default function SupportPage() {
  const [inquiries, setInquiries] = useState([])
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')

    try {
      const data = await customerApi.getInquiries()
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : []
      setInquiries(list)
    } catch (e) {
      setInquiries([])
      setError(e.message || '문의 내역을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // effect에서 Promise를 cleanup 값으로 반환하지 않는다.
    // React StrictMode에서도 고객센터 화면이 흰 화면으로 깨지지 않게 한다.
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const inquiry = await customerApi.createInquiry(form)

      if (file && inquiry?.inquiry_id) {
        await customerApi.uploadInquiryFile(inquiry.inquiry_id, file)
      }

      setForm(initialForm)
      setFile(null)
      setOpen(false)
      await load()
    } catch (e) {
      setError(e.message || '문의를 등록하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="page-title row-title">
        <div>
          <span>HELP CENTER</span>
          <h1>고객센터</h1>
          <p>상품, 배송, 결제, 환불에 대해 문의하세요.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={18} /> : <Plus size={18} />}
          {open ? '문의 닫기' : '1:1 문의하기'}
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="support-hero">
        <Headphones />
        <div>
          <strong>빠른 도움이 필요하신가요?</strong>
          <span>AI 챗봇에게 먼저 물어보거나 회사 정책을 확인해보세요.</span>
        </div>
        <Link to="/ai">AI 도우미 열기</Link>
      </div>

      {open && (
        <form className="panel form-stack" onSubmit={submit}>
          <label>
            문의 유형
            <select
              value={form.category_code}
              onChange={(e) => setForm((prev) => ({ ...prev, category_code: e.target.value }))}
            >
              <option value="PRODUCT">상품</option>
              <option value="DELIVERY">배송</option>
              <option value="PAYMENT">결제</option>
              <option value="REFUND">환불</option>
              <option value="ETC">기타</option>
            </select>
          </label>

          <label>
            제목
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={200}
              placeholder="문의 제목을 입력해주세요"
              required
            />
          </label>

          <label>
            내용
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={6}
              placeholder="문의 내용을 자세히 입력해주세요"
              required
            />
          </label>

          <label className="file-field">
            <FileUp />
            첨부파일 (최대 10MB)
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.secret_yn === 'Y'}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                secret_yn: e.target.checked ? 'Y' : 'N',
              }))}
            />
            비밀 문의
          </label>

          <button className="btn btn-primary" disabled={saving}>
            {saving ? '등록 중...' : '문의 등록'}
          </button>
        </form>
      )}

      <h2 className="subheading">내 문의 내역</h2>

      {loading ? (
        <div className="loading-box">문의 내역을 불러오는 중...</div>
      ) : (
        <div className="inquiry-list">
          {inquiries.map((q) => (
            <Link
              key={q.inquiry_id}
              to={`/support/${q.inquiry_id}`}
              className="inquiry-card inquiry-card-link"
              aria-label={`${q.title || '문의'} 상세 보기`}
            >
              <div>
                <span className="category-tag">{q.category_code || 'ETC'}</span>
                <strong>{q.title || '제목 없음'}</strong>
                <span>
                  {q.created_at ? new Date(q.created_at).toLocaleString('ko-KR') : ''}
                </span>
              </div>

              <div className="inquiry-card-action">
                <span className={`status-pill ${q.has_answer ? 'done' : ''}`}>
                  {q.has_answer ? '답변완료' : (q.inquiry_status || 'RECEIVED')}
                </span>
                <ChevronRight size={19} />
              </div>
            </Link>
          ))}

          {!inquiries.length && (
            <div className="empty-box">
              등록한 문의가 없습니다. 궁금한 점이 있다면 1:1 문의를 남겨주세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
