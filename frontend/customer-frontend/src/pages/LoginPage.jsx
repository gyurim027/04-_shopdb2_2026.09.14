import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true })
  }, [isLoggedIn, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(loginId, password)
      navigate(location.state?.from || '/')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon"><LockKeyhole /></div>
        <h1>로그인</h1>
        <p>BUYER 권한이 있는 고객 계정으로 ShopDB를 이용하세요.</p>

        {location.state?.registered && <div className="notice success compact">회원가입이 완료되었습니다. 로그인해주세요.</div>}
        {location.state?.roleError && <div className="notice error compact">고객(BUYER) 권한이 없는 계정은 고객몰을 이용할 수 없습니다.</div>}

        <form onSubmit={submit} className="form-stack">
          <label>아이디<input value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoComplete="username" /></label>
          <label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          {error && <div className="notice error compact">{error}</div>}
          <button className="btn btn-primary full" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
        </form>
        <div className="auth-bottom">아직 회원이 아니신가요? <Link to="/register">회원가입</Link></div>
      </div>
    </div>
  )
}
