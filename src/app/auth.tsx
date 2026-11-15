import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  AuthResponseSchema,
  SessionResponseSchema,
  RegisterInputSchema,
  LoginInputSchema,
} from '@/api/contracts/auth'
import type { RegisterInput, LoginInput, UserSummary, AuthResponse } from '@/api/contracts/auth'
import { configureApiAuth, configureGuestCart } from '@/api/client'

const TOKEN_KEY = 'jungle-auth-token'

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export interface AuthState {
  user: UserSummary | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthActions {
  login: (input: LoginInput) => Promise<AuthResponse>
  register: (input: RegisterInput) => Promise<AuthResponse>
  logout: () => Promise<void>
}

export interface AuthContextValue extends AuthState, AuthActions {}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getToken(),
    isLoading: true,
    isAuthenticated: false,
  })

  configureApiAuth(getToken, () => {
    setState((s) => ({ ...s, user: null, token: null, isAuthenticated: false }))
    removeToken()
  })
  configureGuestCart(() => null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiRequest(SessionResponseSchema, {
          method: 'GET',
          url: API_PATHS.auth.session,
        })
        if (!mounted) return
        if (res.authenticated && res.user && state.token) {
          setState({ user: res.user, token: state.token, isLoading: false, isAuthenticated: true })
        } else {
          setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
          removeToken()
        }
      } catch {
        if (!mounted) return
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
        removeToken()
      }
    })()
    return () => {
      mounted = false
    }
  }, [state.token])

  const login = useCallback(async (input: LoginInput): Promise<AuthResponse> => {
    const parsed = LoginInputSchema.parse(input)
    const res = await apiRequest(AuthResponseSchema, {
      method: 'POST',
      url: API_PATHS.auth.login,
      data: parsed,
    })
    setToken(res.token)
    setState({ user: res.user, token: res.token, isLoading: false, isAuthenticated: true })
    return res
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<AuthResponse> => {
    const parsed = RegisterInputSchema.parse(input)
    const res = await apiRequest(AuthResponseSchema, {
      method: 'POST',
      url: API_PATHS.auth.register,
      data: parsed,
    })
    setToken(res.token)
    setState({ user: res.user, token: res.token, isLoading: false, isAuthenticated: true })
    return res
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (state.token) {
        await apiRequest(
          z.object({ ok: z.boolean() }),
          {
            method: 'POST',
            url: API_PATHS.auth.logout,
            headers: { Authorization: `Bearer ${state.token}` },
          },
        )
      }
    } catch {
      // ignore logout errors; always clear local state
    }
    removeToken()
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
  }, [state.token])

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
