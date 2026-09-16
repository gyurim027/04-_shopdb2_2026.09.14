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

export async function apiRequest(path, options = {}) {
  const token = getToken()
  const headers = new Headers(options.headers || {})
  const isForm = options.body instanceof FormData

  if (!isForm && options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload?.detail
      ? (Array.isArray(payload.detail) ? payload.detail.map((x) => x.msg).join(', ') : payload.detail)
      : `요청에 실패했습니다. (${response.status})`
    const error = new Error(detail)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
