const ACCESS_TOKEN_KEY = 'shopdb2_access_token'

// 브라우저 탭이 열려 있는 동안 JWT를 보관합니다.
export function saveAccessToken(token) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function removeAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

// JWT의 payload 부분을 읽습니다.
// 서명 검증은 백엔드가 담당하며, 프론트에서는 화면 권한 확인에만 사용합니다.
export function decodeAccessToken(token) {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      Array.from(atob(base64))
        .map(
          (character) =>
            `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`,
        )
        .join(''),
    )

    return JSON.parse(decoded)
  } catch {
    return null
  }
}

// BUYER 역할이 함께 있어도 SELLER가 포함되어 있으면 접근을 허용합니다.
export function hasSellerRole(token) {
  const payload = decodeAccessToken(token)

  return Array.isArray(payload?.roles) && payload.roles.includes('SELLER')
}