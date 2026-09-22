import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './LoginPage.css'
import { login } from '../services/authService'
import {
  hasSellerRole,
  saveAccessToken,
} from '../services/authStorage'

// 개발·테스트 환경에서만 사용하는 공개 테스트 계정입니다.
// 실제 운영 계정의 비밀번호는 프론트 코드에 작성하면 안 됩니다.
const TEST_SELLERS = [
  {
    key: 'seller1',
    label: '셀러1',
    loginId: 'seller01',
    password: 'seller01',
    branchName: '스마트쇼핑 전주지사',
    companyName: '스마트전자',
  },
  {
    key: 'seller2',
    label: '셀러2',
    loginId: 'seller02',
    password: 'seller02',
    branchName: '스마트쇼핑 부산지사',
    companyName: '스마트패션',
  },
]

function LoginPage() {
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTestLogin, setActiveTestLogin] = useState('')

  // 일반 로그인과 테스트 로그인이 같은 인증 과정을 사용합니다.
  async function performLogin(
    targetLoginId,
    targetPassword,
    testLoginKey = '',
  ) {
    setErrorMessage('')
    setIsLoading(true)
    setActiveTestLogin(testLoginKey)

    try {
      const data = await login(targetLoginId, targetPassword)

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
      setActiveTestLogin('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await performLogin(loginId, password)
  }

  async function handleTestLogin(testSeller) {
    // 어떤 계정으로 로그인하는지 입력창에서도 확인할 수 있게 채웁니다.
    setLoginId(testSeller.loginId)
    setPassword(testSeller.password)

    await performLogin(
      testSeller.loginId,
      testSeller.password,
      testSeller.key,
    )
  }

  return (
    <main className="login-page">
      <div className="login-shell">
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
                onChange={(event) =>
                  setLoginId(event.target.value)
                }
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
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                required
              />
            </div>

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
              {isLoading && !activeTestLogin
                ? '로그인 중...'
                : '로그인'}
            </button>
          </form>

          <p className="login-help">
            로그인에 문제가 있다면 관리자에게 문의해 주세요.
          </p>
        </section>

        {import.meta.env.DEV && (
          <aside className="test-login-panel">
            <div className="test-login-heading">
              <span>개발용</span>
              <h2>테스트 계정으로 바로 로그인</h2>
              <p>
                계정을 선택하면 아이디와 비밀번호를 입력하지 않고
                바로 로그인합니다.
              </p>
            </div>

            <div className="test-login-list">
              {TEST_SELLERS.map((testSeller) => (
                <button
                  className="test-seller-card"
                  type="button"
                  key={testSeller.key}
                  onClick={() => handleTestLogin(testSeller)}
                  disabled={isLoading}
                  aria-label={`${testSeller.label} ${testSeller.companyName} 계정으로 로그인`}
                >
                  <span className="test-seller-branch">
                    {testSeller.branchName}
                  </span>

                  <strong>{testSeller.companyName}</strong>

                  <small>
                    ID {testSeller.loginId} / PW{' '}
                    {testSeller.password}
                  </small>

                  <span className="test-seller-action">
                    {activeTestLogin === testSeller.key
                      ? '로그인 중...'
                      : `${testSeller.label}로 로그인 →`}
                  </span>
                </button>
              ))}
            </div>

            <p className="test-login-notice">
              이 영역은 개발 서버에서만 표시되는 테스트
              기능입니다.
            </p>
          </aside>
        )}
      </div>
    </main>
  )
}

export default LoginPage