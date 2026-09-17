const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000'

export function getToken() {
  return localStorage.getItem('shopdb2_access_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('shopdb2_access_token', token)
  else localStorage.removeItem('shopdb2_access_token')
}

export function resolveMediaUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

function normalizeErrorMessage(payload, status) {
  if (typeof payload === 'object' && payload?.detail) {
    if (Array.isArray(payload.detail)) return payload.detail.map((item) => item.msg).join(', ')
    if (typeof payload.detail === 'string') return payload.detail
  }

  if (status === 401) return '로그인이 만료되었거나 인증 정보가 올바르지 않습니다.'
  if (status === 403) return '이 기능을 사용할 권한이 없습니다.'
  if (status === 404) return '요청한 정보를 찾을 수 없습니다.'
  if (status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  return `요청에 실패했습니다. (${status})`
}

export async function apiRequest(path, options = {}) {
  const token = getToken()
  const headers = new Headers(options.headers || {})
  const isForm = options.body instanceof FormData

  if (!isForm && options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    const error = new Error('백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해주세요.')
    error.status = 0
    throw error
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null)
      localStorage.removeItem('shopdb2_user')
      window.dispatchEvent(new CustomEvent('shopdb2:auth-expired'))
    }

    const error = new Error(normalizeErrorMessage(payload, response.status))
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
