import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { customerApi } from '../api/customer'
import { setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shopdb2_user') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) localStorage.setItem('shopdb2_user', JSON.stringify(user))
    else localStorage.removeItem('shopdb2_user')
  }, [user])

  const login = async (loginId, password) => {
    setLoading(true)
    try {
      const data = await customerApi.login({ login_id: loginId, password })
      if (!data.user?.roles?.includes('BUYER')) throw new Error('고객(BUYER) 계정만 이용할 수 있습니다.')
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

  const value = useMemo(() => ({ user, isLoggedIn: !!user, loading, login, logout, refreshProfile }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider가 필요합니다.')
  return value
}
