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

function createGuestCredentials() {
  const random = Math.random().toString(36).slice(2, 9)
  const stamp = Date.now().toString(36)
  const id = `guest_${stamp}_${random}`

  return {
    login_id: id,
    password: `Guest!${stamp}${random}A1`,
    user_name: '게스트',
    email: `${id}@shopdb.local`,
    phone: null,
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

  const applyLoginResponse = (data, { guest = false } = {}) => {
    const roles = data.user?.roles || []

    if (!roles.includes('BUYER')) {
      setToken(null)
      throw new Error('고객(BUYER) 권한이 있는 계정만 고객몰에 로그인할 수 있습니다.')
    }

    const nextUser = guest
      ? { ...data.user, is_guest: true }
      : data.user

    setToken(data.access_token)
    setUser(nextUser)
    return nextUser
  }

  const login = async (loginId, password) => {
    setLoading(true)
    try {
      const data = await customerApi.login({ login_id: loginId, password })
      return applyLoginResponse(data)
    } finally {
      setLoading(false)
    }
  }

  const guestLogin = async () => {
    setLoading(true)

    try {
      const credentials = createGuestCredentials()

      await customerApi.register(credentials)

      const data = await customerApi.login({
        login_id: credentials.login_id,
        password: credentials.password,
      })

      const guestUser = applyLoginResponse(data, { guest: true })

      // 주문/장바구니/결제까지 바로 검사할 수 있도록
      // 게스트 계정에 기본 배송지를 자동으로 하나 준비한다.
      try {
        const addresses = await customerApi.getAddresses()
        const list = Array.isArray(addresses) ? addresses : []

        if (!list.length) {
          await customerApi.createAddress({
            address_name: '게스트 기본 배송지',
            receiver_name: '게스트',
            receiver_phone: '010-0000-0000',
            zipcode: '00000',
            address1: '검사용 기본 배송지',
            address2: '',
            default_yn: 'Y',
          })
        }
      } catch (addressError) {
        setToken(null)
        setUser(null)
        throw new Error(
          addressError?.message
          || '게스트 기본 배송지를 준비하지 못했습니다. 다시 시도해주세요.',
        )
      }

      return guestUser
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
    isGuest: Boolean(user?.is_guest),
    loading,
    login,
    guestLogin,
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
