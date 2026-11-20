import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest, configureApiAuth, configureGuestCart } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  AuthResponseSchema,
  SessionResponseSchema,
  RegisterInputSchema,
  LoginInputSchema,
} from '@/api/contracts/auth'
import { MergeCartResponseSchema } from '@/api/contracts/cart'
import type { RegisterInput, LoginInput, UserSummary, AuthResponse } from '@/api/contracts/auth'
import { purgePrivateQueries, queryKeys } from './query-keys'
import { announce } from '@/lib/announce'

const TOKEN_KEY = 'jungle-auth-token'
const GUEST_CART_KEY = 'jungle-guest-cart-id'

export function getGuestCartId(): string | null {
  if (typeof localStorage === 'undefined') return null
  let id = localStorage.getItem(GUEST_CART_KEY)
  if (!id) {
    id = `guest_${crypto.randomUUID().replace(/-/g, '')}`
    localStorage.setItem(GUEST_CART_KEY, id)
  }
  return id
}

function resetGuestCartId(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(GUEST_CART_KEY)
}

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

// Os getters são estáticos: configurá-los no escopo do módulo garante que as primeiras
// consultas (efeitos dos filhos rodam antes dos do pai) já saiam com Authorization e X-Cart-Id.
configureApiAuth(getToken)
configureGuestCart(getGuestCartId)

export interface AuthState {
  user: UserSummary | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  /** A sessão foi encerrada pelo servidor (expiração); a tela de login explica o motivo. */
  sessionExpired: boolean
}

export interface AuthActions {
  login: (input: LoginInput) => Promise<AuthResponse>
  register: (input: RegisterInput) => Promise<AuthResponse>
  logout: () => Promise<void>
  /** Reflete no cabeçalho alterações de perfil confirmadas pela API. */
  updateUser: (patch: Partial<UserSummary>) => void
}

export interface AuthContextValue extends AuthState, AuthActions {}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

/** Escopo do cache privado: id do usuário autenticado ou "guest". */
export function useIdentityScope(): string {
  return useAuth().user?.id ?? 'guest'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getToken(),
    isLoading: true,
    isAuthenticated: false,
    sessionExpired: false,
  })

  const identity = state.user?.id ?? 'guest'
  const previousIdentity = useRef(identity)

  // Troca de identidade (login, logout, expiração, outro usuário): nenhum dado privado da
  // identidade anterior pode permanecer no cache.
  useEffect(() => {
    if (previousIdentity.current === identity) return
    previousIdentity.current = identity
    void purgePrivateQueries(queryClient)
  }, [identity, queryClient])

  // Restauração da sessão após refresh.
  useEffect(() => {
    let active = true
    const token = getToken()
    if (!token) {
      setState((s) => ({ ...s, token: null, isLoading: false }))
      return
    }
    apiRequest(SessionResponseSchema, { method: 'GET', url: API_PATHS.auth.session })
      .then((res) => {
        if (!active) return
        if (res.authenticated && res.user) {
          setState({ user: res.user, token, isLoading: false, isAuthenticated: true, sessionExpired: false })
        } else {
          removeToken()
          setState({ user: null, token: null, isLoading: false, isAuthenticated: false, sessionExpired: true })
        }
      })
      .catch(() => {
        if (!active) return
        // Falha transitória: não derruba o token; a tela mostra o estado de visitante até o próximo refresh.
        setState({ user: null, token, isLoading: false, isAuthenticated: false, sessionExpired: false })
      })
    return () => {
      active = false
    }
  }, [])

  // Sessão expirada durante a navegação ou o checkout: encerra a sessão local e avisa; as rotas
  // privadas redirecionam para /entrar preservando o destino, e o contexto do checkout é retomado.
  useEffect(() => {
    configureApiAuth(getToken, () => {
      if (!getToken()) return
      removeToken()
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false, sessionExpired: true })
      announce('Sua sessão expirou. Entre novamente para continuar.', 'assertive')
    })
    return () => configureApiAuth(getToken, null)
  }, [])

  const completeAuth = useCallback(
    async (res: AuthResponse) => {
      await purgePrivateQueries(queryClient)
      setToken(res.token)
      setState({ user: res.user, token: res.token, isLoading: false, isAuthenticated: true, sessionExpired: false })
      // Preserva os itens do visitante: move o carrinho do visitante para o do usuário.
      try {
        await apiRequest(MergeCartResponseSchema, { method: 'POST', url: API_PATHS.cart.merge })
      } catch {
        // Melhor esforço: o carrinho é relido a seguir e mostra o que existir.
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.root })
    },
    [queryClient],
  )

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResponse> => {
      const parsed = LoginInputSchema.parse(input)
      const res = await apiRequest(AuthResponseSchema, { method: 'POST', url: API_PATHS.auth.login, data: parsed })
      await completeAuth(res)
      return res
    },
    [completeAuth],
  )

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResponse> => {
      const parsed = RegisterInputSchema.parse(input)
      const res = await apiRequest(AuthResponseSchema, { method: 'POST', url: API_PATHS.auth.register, data: parsed })
      await completeAuth(res)
      return res
    },
    [completeAuth],
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (getToken()) await apiRequest(z.object({ ok: z.boolean() }), { method: 'POST', url: API_PATHS.auth.logout })
    } catch {
      // Falha ao avisar o servidor não impede o encerramento local.
    }
    removeToken()
    resetGuestCartId() // o próximo visitante começa com um carrinho novo
    await purgePrivateQueries(queryClient)
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false, sessionExpired: false })
  }, [queryClient])

  const updateUser = useCallback((patch: Partial<UserSummary>) => {
    setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ ...state, login, register, logout, updateUser }), [state, login, register, logout, updateUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
