import {
  getAccessToken,
  removeAccessToken,
} from './authStorage'

// 백엔드 API의 공통 시작 주소입니다.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

// 요청 본문에 맞게 공통 헤더를 생성합니다.
function createRequestHeaders(options, token) {
  const headers = new Headers(options.headers || {})
  const isFormData = options.body instanceof FormData

  // FormData는 브라우저가 multipart boundary를 자동으로 설정해야 합니다.
  // 따라서 Content-Type을 직접 지정하지 않습니다.
  if (
    options.body !== undefined &&
    !isFormData &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

// 인증 만료 응답을 공통으로 처리합니다.
function handleUnauthorized(response) {
  if (response.status !== 401) {
    return
  }

  removeAccessToken()
  window.location.replace('/login')

  throw new Error('로그인이 만료되었습니다.')
}

// FastAPI 오류 응답에서 사용자에게 표시할 문구를 가져옵니다.
async function getErrorMessage(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = await response.json()
    const detail = data?.detail

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || '입력값을 확인해 주세요.')
        .join('\n')
    }

    if (typeof detail === 'string') {
      return detail
    }
  } else {
    const message = await response.text()

    if (message.trim()) {
      return message
    }
  }

  return '요청을 처리하지 못했습니다.'
}

// 공통 fetch 요청을 실행합니다.
async function fetchWithAuth(path, options = {}) {
  const token = getAccessToken()
  const headers = createRequestHeaders(options, token)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  handleUnauthorized(response)

  return response
}

// JSON API 요청에 사용합니다.
export async function apiRequest(path, options = {}) {
  const response = await fetchWithAuth(path, options)

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  // 삭제 API처럼 응답 내용이 없는 경우를 처리합니다.
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// 이미지 미리보기와 첨부파일 다운로드에 사용합니다.
export async function apiBlobRequest(path, options = {}) {
  const response = await fetchWithAuth(path, options)

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response.blob()
}