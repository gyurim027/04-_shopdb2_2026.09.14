import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { customerApi } from '../api/customer'
import { getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const value = JSON.parse(localStorage.getItem('shopdb2_user') || 'null')
    return getToken() ? value : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) localStorage.setItem('shopdb2_user', JSON.stringify(user))
    else localStorage.removeItem('shopdb2_user')
  }, [user])

  useEffect(() => {
    const expire = () => setUser(null)
    window.addEventListener('shopdb2:auth-expired', expire)
    return () => window.removeEventListener('shopdb2:auth-expired', expire)
  }, [])

  const login = async (loginId, password) => {
    setLoading(true)
    try {
      const data = await customerApi.login({ login_id: loginId, password })
      const roles = data.user?.roles || []

      if (!roles.includes('BUYER')) {
        setToken(null)
        throw new Error('고객(BUYER) 권한이 있는 계정만 고객몰에 로그인할 수 있습니다.')
      }

      setToken(data.access_token)
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const refreshProfile = async () => {
    const profile = await customerApi.getProfile()
    setUser((prev) => ({ ...prev, ...profile }))
    return profile
  }

  const value = useMemo(() => ({
    user,
    isLoggedIn: Boolean(user && getToken()),
    hasBuyerRole: Boolean(user?.roles?.includes('BUYER')),
    loading,
    login,
    logout,
    refreshProfile,
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider가 필요합니다.')
  return value
}
