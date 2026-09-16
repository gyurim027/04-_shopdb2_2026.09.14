import { useEffect, useState } from 'react'
import { MapPin, Plus, Star, Trash2, X } from 'lucide-react'
import { customerApi } from '../api/customer'

const blank = {
  address_name: '',
  receiver_name: '',
  receiver_phone: '',
  zipcode: '',
  address1: '',
  address2: '',
  default_yn: 'N',
}

export default function AddressesPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async ({ openWhenEmpty = false } = {}) => {
    setError('')
    try {
      const data = await customerApi.getAddresses()
      const list = Array.isArray(data) ? data : []
      setItems(list)
      if (openWhenEmpty && list.length === 0) setOpen(true)
    } catch (e) {
      setError(e.message || '배송지 정보를 불러오지 못했습니다.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Promise를 effect의 cleanup 값으로 반환하지 않도록 감싸서 실행한다.
    // React StrictMode에서도 배송지 페이지가 흰 화면으로 깨지지 않는다.
    load({ openWhenEmpty: true })
  }, [])

  const change = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await customerApi.createAddress(form)
      setForm(blank)
      setOpen(false)
      await load()
    } catch (e) {
      setError(e.message || '배송지를 등록하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!window.confirm('이 배송지를 삭제할까요?')) return

    setError('')
    try {
      await customerApi.deleteAddress(id)
      await load({ openWhenEmpty: true })
    } catch (e) {
      setError(e.message || '배송지를 삭제하지 못했습니다.')
    }
  }

  return (
    <div className="container page-section">
      <div className="page-title row-title">
        <div>
          <span>DELIVERY</span>
          <h1>배송지 관리</h1>
          <p>주문에 사용할 배송지를 등록하고 관리하세요.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={18} /> : <Plus size={18} />}
          {open ? '입력 닫기' : '배송지 추가'}
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      {open && (
        <form className="panel form-grid address-form" onSubmit={submit}>
          <div className="address-form-heading full-row">
            <div>
              <strong>새 배송지 등록</strong>
              <span>받는 분과 배송받을 주소를 입력해주세요.</span>
            </div>
          </div>

          <label>
            배송지 이름
            <input
              value={form.address_name}
              onChange={change('address_name')}
              placeholder="예: 우리집, 회사"
              autoFocus
            />
          </label>

          <label>
            받는 사람
            <input
              value={form.receiver_name}
              onChange={change('receiver_name')}
              placeholder="받는 분 이름"
            />
          </label>

          <label>
            전화번호
            <input
              value={form.receiver_phone}
              onChange={change('receiver_phone')}
              placeholder="010-0000-0000"
            />
          </label>

          <label>
            우편번호
            <input
              value={form.zipcode}
              onChange={change('zipcode')}
              placeholder="우편번호"
            />
          </label>

          <label className="full-row">
            주소
            <input
              value={form.address1}
              onChange={change('address1')}
              placeholder="기본 주소"
            />
          </label>

          <label className="full-row">
            상세주소
            <input
              value={form.address2}
              onChange={change('address2')}
              placeholder="동/호수 등 상세 주소"
            />
          </label>

          <label className="checkbox-row full-row">
            <input
              type="checkbox"
              checked={form.default_yn === 'Y'}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                default_yn: e.target.checked ? 'Y' : 'N',
              }))}
            />
            기본 배송지로 설정
          </label>

          <button className="btn btn-primary full-row" disabled={saving}>
            {saving ? '등록 중...' : '배송지 등록하기'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading-box">배송지 정보를 불러오는 중...</div>
      ) : (
        <div className="address-list">
          {items.map((a) => (
            <article className="address-card" key={a.address_id}>
              <div className="address-title">
                <div>
                  <MapPin />
                  <strong>{a.address_name || '배송지'}</strong>
                  {a.default_yn === 'Y' && (
                    <span className="default-badge">
                      <Star size={13} /> 기본배송지
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => del(a.address_id)}
                  aria-label="배송지 삭제"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <p><b>{a.receiver_name || '-'}</b> · {a.receiver_phone || '-'}</p>
              <p>[{a.zipcode || '-'}] {a.address1 || ''} {a.address2 || ''}</p>
            </article>
          ))}

          {!items.length && !open && (
            <div className="empty-box address-empty">
              <MapPin size={28} />
              <strong>등록된 배송지가 없습니다.</strong>
              <span>첫 배송지를 등록하면 주문 화면에서 바로 선택할 수 있어요.</span>
              <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
                <Plus size={17} /> 배송지 등록하기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
