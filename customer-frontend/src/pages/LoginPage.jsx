import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [loginId, setLoginId] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const { login, loading } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const submit = async (e) => { e.preventDefault(); setError(''); try { await login(loginId, password); navigate(location.state?.from || '/') } catch (e) { setError(e.message) } }
  return <div className="auth-page"><div className="auth-card"><div className="auth-icon"><LockKeyhole /></div><h1>로그인</h1><p>고객 계정으로 ShopDB를 이용하세요.</p><form onSubmit={submit} className="form-stack"><label>아이디<input value={loginId} onChange={(e) => setLoginId(e.target.value)} required /></label><label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{error && <div className="notice error compact">{error}</div>}<button className="btn btn-primary full" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button></form><div className="auth-bottom">아직 회원이 아니신가요? <Link to="/register">회원가입</Link></div></div></div>
}
