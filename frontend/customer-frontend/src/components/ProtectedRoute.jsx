import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, isLoggedIn, logout } = useAuth()
  const location = useLocation()
  const hasToken = Boolean(getToken())
  const hasBuyerRole = Boolean(user?.roles?.includes('BUYER'))

  useEffect(() => {
    if (isLoggedIn && hasToken && !hasBuyerRole) logout()
  }, [hasBuyerRole, hasToken, isLoggedIn, logout])

  if (!isLoggedIn || !hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!hasBuyerRole) {
    return <Navigate to="/login" replace state={{ roleError: true, from: location.pathname }} />
  }

  return children
}
