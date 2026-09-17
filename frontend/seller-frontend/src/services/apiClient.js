import {
  getAccessToken,
  removeAccessToken,
} from './authStorage'

// 백엔드 API의 공통 시작 주소입니다.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

// 로그인 이후의 셀러 API 요청에 공통으로 사용하는 함수입니다.
export async function apiRequest(path, options = {}) {
  const token = getAccessToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,

      // 저장된 JWT를 백엔드에 전달합니다.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  // 토큰이 만료되거나 유효하지 않으면 로그인 화면으로 이동합니다.
  if (response.status === 401) {
    removeAccessToken()
    window.location.replace('/login')

    throw new Error('로그인이 만료되었습니다.')
  }

  // 삭제 API처럼 응답 내용이 없는 경우를 처리합니다.
  const data = response.status === 204 ? null : await response.json()

  // 200번대 응답이 아니면 백엔드의 오류 메시지를 표시합니다.
  if (!response.ok) {
    throw new Error(data?.detail || '요청을 처리하지 못했습니다.')
  }

  return data
}