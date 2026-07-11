import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  clearToken,
  getToken,
  login as apiLogin,
  SESSION_EXPIRED_EVENT,
} from '@/lib/apiClient'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getToken() !== null)

  useEffect(() => {
    const handleSessionExpired = () => setIsAuthenticated(false)
    const handleStorage = () => setIsAuthenticated(getToken() !== null)

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const login = async (username: string, password: string) => {
    await apiLogin(username, password)
    setIsAuthenticated(true)
  }

  const logout = () => {
    clearToken()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
