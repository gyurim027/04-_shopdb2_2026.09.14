import { Navigate, Outlet } from 'react-router-dom'

import {
  getAccessToken,
  hasSellerRole,
  removeAccessToken,
} from '../services/authStorage'

function RequireSellerAuth() {
  const token = getAccessToken()

  // 토큰이 없거나 SELLER 역할이 없으면 로그인 화면으로 보냅니다.
  if (!token || !hasSellerRole(token)) {
    removeAccessToken()
    return <Navigate to="/login" replace />
  }

  // 인증된 셀러에게만 하위 페이지를 보여줍니다.
  return <Outlet />
}

export default RequireSellerAuth