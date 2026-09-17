// 환경변수가 없으면 로컬 FastAPI 서버 주소를 사용합니다.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

export async function login(loginId, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login_id: loginId,
      password,
    }),
  })

  const data = await response.json()

  // 401 등의 오류 응답이면 로그인 화면에서 처리할 오류를 발생시킵니다.
  if (!response.ok) {
    throw new Error(data.detail || '로그인에 실패했습니다.')
  }

  return data
}