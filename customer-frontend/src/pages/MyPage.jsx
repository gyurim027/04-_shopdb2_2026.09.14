import { useEffect, useState } from 'react'
import { Bot, ChevronRight, ClipboardList, MapPin, RefreshCcw, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { useAuth } from '../context/AuthContext'

export default function MyPage() {
  const { user, refreshProfile } = useAuth(); const [profile, setProfile] = useState(user); const [edit, setEdit] = useState(false); const [form, setForm] = useState({ user_name: user?.user_name || '', email: user?.email || '', phone: user?.phone || '' }); const [message, setMessage] = useState('')
  useEffect(() => { customerApi.getProfile().then((p) => { setProfile(p); setForm({ user_name: p.user_name || '', email: p.email || '', phone: p.phone || '' }) }).catch(() => {}) }, [])
  const save = async (e) => { e.preventDefault(); const p = await customerApi.updateProfile(form); setProfile(p); await refreshProfile(); setEdit(false); setMessage('회원정보를 수정했습니다.') }
  const menus = [{ to: '/orders', icon: ClipboardList, title: '주문내역', text: '주문 상태와 상세 정보 확인' }, { to: '/addresses', icon: MapPin, title: '배송지 관리', text: '배송지 등록·수정·삭제' }, { to: '/refunds', icon: RefreshCcw, title: '취소/환불', text: '환불 요청 및 처리상태 확인' }, { to: '/ai', icon: Bot, title: 'AI 도우미', text: '상품·정책 관련 질문하기' }]
  return <div className="container page-section"><div className="page-title"><span>MY SHOPDB</span><h1>마이페이지</h1><p>{profile?.user_name}님의 쇼핑 정보를 관리하세요.</p></div>
    <div className="mypage-grid"><section className="profile-card"><div className="profile-head"><div className="profile-avatar"><UserRound /></div><div><strong>{profile?.user_name}</strong><span>{profile?.login_id}</span></div><button className="small-btn" onClick={() => setEdit(!edit)}>{edit ? '취소' : '정보수정'}</button></div>{message && <div className="notice success compact">{message}</div>}{edit ? <form className="form-stack compact-form" onSubmit={save}><label>이름<input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} /></label><label>이메일<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>전화번호<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><button className="btn btn-primary">저장</button></form> : <div className="profile-info"><div><span>이메일</span><b>{profile?.email || '-'}</b></div><div><span>전화번호</span><b>{profile?.phone || '-'}</b></div><div><span>계정상태</span><b>{profile?.user_status || '-'}</b></div></div>}</section>
      <section className="menu-cards">{menus.map((m) => <Link key={m.to} to={m.to} className="menu-card"><div className="menu-icon"><m.icon /></div><div><strong>{m.title}</strong><span>{m.text}</span></div><ChevronRight /></Link>)}</section></div>
  </div>
}
