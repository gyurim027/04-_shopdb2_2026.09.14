import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { customerApi } from '../api/customer'

export default function RegisterPage() {
  const navigate = useNavigate(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ login_id: '', password: '', user_name: '', email: '', phone: '' })
  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { await customerApi.register({ ...form, phone: form.phone || null }); navigate('/login', { state: { registered: true } }) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <div className="auth-page"><div className="auth-card wide"><div className="auth-icon"><UserPlus /></div><h1>회원가입</h1><p>고객 계정을 만들고 쇼핑을 시작하세요.</p><form onSubmit={submit} className="form-grid"><label>아이디<input value={form.login_id} onChange={change('login_id')} minLength={4} required placeholder="4자 이상" /></label><label>이름<input value={form.user_name} onChange={change('user_name')} required /></label><label className="full-row">비밀번호<input type="password" value={form.password} onChange={change('password')} minLength={8} required placeholder="8자 이상" /></label><label>이메일<input type="email" value={form.email} onChange={change('email')} required /></label><label>전화번호<input value={form.phone} onChange={change('phone')} placeholder="010-0000-0000" /></label>{error && <div className="notice error compact full-row">{error}</div>}<button className="btn btn-primary full-row" disabled={busy}>{busy ? '가입 중...' : '회원가입'}</button></form><div className="auth-bottom">이미 계정이 있으신가요? <Link to="/login">로그인</Link></div></div></div>
}
