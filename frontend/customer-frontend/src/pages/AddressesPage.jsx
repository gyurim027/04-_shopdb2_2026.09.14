import { useEffect, useState } from 'react'
import { Edit3, MapPin, Plus, Star, Trash2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'

const blank = {
  address_name: '',
  receiver_name: '',
  receiver_phone: '',
  zipcode: '',
  address1: '',
  address2: '',
  default_yn: 'N',
}

function toForm(address) {
  return {
    address_name: address?.address_name || '',
    receiver_name: address?.receiver_name || '',
    receiver_phone: address?.receiver_phone || '',
    zipcode: address?.zipcode || '',
    address1: address?.address1 || '',
    address2: address?.address2 || '',
    default_yn: address?.default_yn === 'Y' ? 'Y' : 'N',
  }
}

export default function AddressesPage() {
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
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

  useEffect(() => { load({ openWhenEmpty: true }) }, [])

  const resetForm = () => {
    setForm(blank)
    setEditingId(null)
    setOpen(false)
  }

  const change = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const startCreate = () => {
    setForm(blank)
    setEditingId(null)
    setOpen(true)
  }

  const startEdit = (address) => {
    setForm(toForm(address))
    setEditingId(address.address_id)
    setOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await customerApi.updateAddress(editingId, form)
        showToast('배송지를 수정했습니다.')
      } else {
        await customerApi.createAddress(form)
        showToast('배송지를 등록했습니다.')
      }
      resetForm()
      await load()
    } catch (e) {
      setError(e.message || '배송지를 저장하지 못했습니다.')
      showToast(e.message || '배송지 저장에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!window.confirm('이 배송지를 삭제할까요?')) return
    setError('')
    try {
      await customerApi.deleteAddress(id)
      showToast('배송지를 삭제했습니다.', 'info')
      await load({ openWhenEmpty: true })
    } catch (e) {
      setError(e.message || '배송지를 삭제하지 못했습니다.')
      showToast(e.message || '배송지 삭제에 실패했습니다.', 'error')
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
        <button type="button" className="btn btn-primary" onClick={() => open ? resetForm() : startCreate()}>
          {open ? <X size={18} /> : <Plus size={18} />}
          {open ? '입력 닫기' : '배송지 추가'}
        </button>
      </div>

      {location.state?.returnTo && items.length > 0 && (
        <div className="notice info return-notice">
          배송지가 준비되었습니다. 상품 화면으로 돌아가 주문을 계속할 수 있습니다.
          <button type="button" onClick={() => navigate(location.state.returnTo)}>상품으로 돌아가기</button>
        </div>
      )}
      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={() => load()}>다시 시도</button></div>}

      {open && (
        <form className="panel form-grid address-form" onSubmit={submit}>
          <div className="address-form-heading full-row">
            <div>
              <strong>{editingId ? '배송지 수정' : '새 배송지 등록'}</strong>
              <span>받는 분과 배송받을 주소를 입력해주세요.</span>
            </div>
          </div>
          <label>배송지 이름<input value={form.address_name} onChange={change('address_name')} placeholder="예: 우리집, 회사" autoFocus /></label>
          <label>받는 사람<input value={form.receiver_name} onChange={change('receiver_name')} placeholder="받는 분 이름" /></label>
          <label>전화번호<input value={form.receiver_phone} onChange={change('receiver_phone')} placeholder="010-0000-0000" /></label>
          <label>우편번호<input value={form.zipcode} onChange={change('zipcode')} placeholder="우편번호" /></label>
          <label className="full-row">주소<input value={form.address1} onChange={change('address1')} placeholder="기본 주소" /></label>
          <label className="full-row">상세주소<input value={form.address2} onChange={change('address2')} placeholder="동/호수 등 상세 주소" /></label>
          <label className="checkbox-row full-row">
            <input type="checkbox" checked={form.default_yn === 'Y'} onChange={(e) => setForm((prev) => ({ ...prev, default_yn: e.target.checked ? 'Y' : 'N' }))} />
            기본 배송지로 설정
          </label>
          <button className="btn btn-primary full-row" disabled={saving}>{saving ? '저장 중...' : editingId ? '배송지 수정하기' : '배송지 등록하기'}</button>
        </form>
      )}

      {loading ? <div className="loading-box">배송지 정보를 불러오는 중...</div> : (
        <div className="address-list">
          {items.map((a) => (
            <article className="address-card" key={a.address_id}>
              <div className="address-title">
                <div><MapPin /><strong>{a.address_name || '배송지'}</strong>{a.default_yn === 'Y' && <span className="default-badge"><Star size={13} /> 기본배송지</span>}</div>
                <div className="address-actions">
                  <button type="button" className="icon-btn" onClick={() => startEdit(a)} aria-label="배송지 수정"><Edit3 size={17} /></button>
                  <button type="button" className="icon-btn danger" onClick={() => del(a.address_id)} aria-label="배송지 삭제"><Trash2 size={17} /></button>
                </div>
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
              <button type="button" className="btn btn-primary" onClick={startCreate}><Plus size={17} /> 배송지 등록하기</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
