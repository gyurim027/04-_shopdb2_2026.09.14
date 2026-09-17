import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './LoginPage.css'
import { login } from '../services/authService'
import { hasSellerRole, saveAccessToken } from '../services/authStorage'

function LoginPage() {
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setErrorMessage('')
    setIsLoading(true)

    try {
      // 입력한 아이디와 비밀번호를 FastAPI 로그인 API로 전달합니다.
      const data = await login(loginId, password)

      if (!data.access_token) {
        throw new Error('로그인 토큰을 받지 못했습니다.')
      }

      // BUYER 역할이 함께 있어도 SELLER가 포함되어 있으면 통과합니다.
      if (!hasSellerRole(data.access_token)) {
        throw new Error('셀러 권한이 없는 계정입니다.')
      }

      // 로그인 토큰을 저장한 뒤 대시보드로 이동합니다.
      saveAccessToken(data.access_token)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="login-logo">S</span>

          <div>
            <strong>Seller Console</strong>
            <span>shopdb2</span>
          </div>
        </div>

        <div className="login-heading">
          <h1>셀러 로그인</h1>
          <p>상품과 주문을 관리하려면 로그인해 주세요.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="loginId">아이디</label>
            <input
              id="loginId"
              name="loginId"
              type="text"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              required
            />
          </div>

          {/* 로그인 실패 시에만 오류 문구를 보여줍니다. */}
          {errorMessage && (
            <p className="login-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            className="login-submit-button"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="login-help">
          로그인에 문제가 있다면 관리자에게 문의해 주세요.
        </p>
      </section>
    </main>
  )
}

export default LoginPage