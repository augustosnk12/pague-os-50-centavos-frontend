import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, removeToken, setToken, getLenderFromStorage, setLenderInStorage, removeLenderFromStorage } from '../lib/cookies'

interface LenderInfo {
  id: string
  email: string
  name: string | null
}

interface AuthContextValue {
  lender: LenderInfo | null
  isAuthenticated: boolean
  authenticate: (token: string, lender: LenderInfo) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const [lender, setLender] = useState<LenderInfo | null>(() => {
    if (!getToken()) return null
    return getLenderFromStorage()
  })

  const authenticate = (token: string, lenderData: LenderInfo) => {
    setToken(token)
    setLenderInStorage(lenderData)
    setLender(lenderData)
  }

  const logout = () => {
    removeToken()
    removeLenderFromStorage()
    setLender(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ lender, isAuthenticated: !!lender && !!getToken(), authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
