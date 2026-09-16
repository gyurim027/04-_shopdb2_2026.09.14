import { useEffect, useState } from 'react'
import {
  Bot,
  ChevronRight,
  ClipboardList,
  Headphones,
  MapPin,
  RefreshCcw,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function MyPage() {
  const { user, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(user)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ user_name: user?.user_name || '', email: user?.email || '', phone: user?.phone || '' })
  const [stats, setStats] = useState({ orders: 0, refunds: 0, inquiries: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    const results = await Promise.allSettled([
      customerApi.getProfile(),
      customerApi.getOrders({ size: 1 }),
      customerApi.getRefunds({ size: 1 }),
      customerApi.getInquiries({ size: 1 }),
    ])

    const [profileResult, orderResult, refundResult, inquiryResult] = results

    if (profileResult.status === 'fulfilled') {
      const p = profileResult.value
      setProfile(p)
      setForm({ user_name: p.user_name || '', email: p.email || '', phone: p.phone || '' })
    } else {
      setError(profileResult.reason?.message || '회원정보를 불러오지 못했습니다.')
    }

    setStats({
      orders: orderResult.status === 'fulfilled' ? Number(orderResult.value?.total || 0) : 0,
      refunds: refundResult.status === 'fulfilled' ? Number(refundResult.value?.total || 0) : 0,
      inquiries: inquiryResult.status === 'fulfilled' ? Number(inquiryResult.value?.total || 0) : 0,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const p = await customerApi.updateProfile(form)
      setProfile(p)
      await refreshProfile()
      setEdit(false)
      showToast('회원정보를 수정했습니다.')
    } catch (e) {
      setError(e.message || '회원정보를 수정하지 못했습니다.')
      showToast(e.message || '회원정보 수정에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const menus = [
    { to: '/orders', icon: ClipboardList, title: '주문내역', text: '주문 상태와 상세 정보 확인' },
    { to: '/addresses', icon: MapPin, title: '배송지 관리', text: '배송지 등록·수정·삭제' },
    { to: '/refunds', icon: RefreshCcw, title: '취소/환불', text: '환불 요청 및 처리상태 확인' },
    { to: '/support', icon: Headphones, title: '고객센터', text: '1:1 문의와 답변 확인' },
    { to: '/ai', icon: Bot, title: 'AI 도우미', text: '상품·정책 관련 질문하기' },
  ]

  return (
    <div className="container page-section">
      <div className="page-title">
        <span>MY SHOPDB</span>
        <h1>마이페이지</h1>
        <p>{profile?.user_name || user?.user_name || '고객'}님의 쇼핑 정보를 한눈에 관리하세요.</p>
      </div>

      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}>다시 시도</button></div>}

      <div className="mypage-stats">
        <Link to="/orders"><span>전체 주문</span><strong>{loading ? '-' : stats.orders}</strong><small>건</small></Link>
        <Link to="/refunds"><span>환불 요청</span><strong>{loading ? '-' : stats.refunds}</strong><small>건</small></Link>
        <Link to="/support"><span>1:1 문의</span><strong>{loading ? '-' : stats.inquiries}</strong><small>건</small></Link>
      </div>

      <div className="mypage-grid">
        <section className="profile-card">
          <div className="profile-head">
            <div className="profile-avatar"><UserRound /></div>
            <div><strong>{profile?.user_name || '-'}</strong><span>{profile?.login_id || user?.login_id || '-'}</span></div>
            <button className="small-btn" onClick={() => setEdit(!edit)}>{edit ? '취소' : '정보수정'}</button>
          </div>

          {edit ? (
            <form className="form-stack compact-form" onSubmit={save}>
              <label>이름<input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} required /></label>
              <label>이메일<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label>전화번호<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <button className="btn btn-primary" disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
            </form>
          ) : (
            <div className="profile-info">
              <div><span>이메일</span><b>{profile?.email || '-'}</b></div>
              <div><span>전화번호</span><b>{profile?.phone || '-'}</b></div>
              <div><span>계정상태</span><b>{profile?.user_status || '-'}</b></div>
              <div><span>고객 권한</span><b className="buyer-role-badge">BUYER</b></div>
            </div>
          )}
        </section>

        <section className="menu-cards">
          {menus.map((m) => (
            <Link key={m.to} to={m.to} className="menu-card">
              <div className="menu-icon"><m.icon /></div>
              <div><strong>{m.title}</strong><span>{m.text}</span></div>
              <ChevronRight />
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
