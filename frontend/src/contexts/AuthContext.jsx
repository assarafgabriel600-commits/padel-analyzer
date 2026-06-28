import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('brev_user')
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validate stored token on boot
    const token = localStorage.getItem('brev_token')
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('brev_token')
          localStorage.removeItem('brev_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const persist = useCallback((resp) => {
    localStorage.setItem('brev_token', resp.access_token)
    const u = {
      id: resp.user_id,
      email: resp.email,
      first_name: resp.first_name,
      last_name: resp.last_name,
    }
    localStorage.setItem('brev_user', JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (data) => {
    const resp = await authApi.register(data)
    return persist(resp)
  }, [persist])

  const login = useCallback(async (data) => {
    const resp = await authApi.login(data)
    return persist(resp)
  }, [persist])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    localStorage.removeItem('brev_token')
    localStorage.removeItem('brev_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
