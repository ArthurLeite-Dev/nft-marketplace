import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { z } from 'zod'
import { API_BASE } from './paths'
import { ApiError, normalizeError } from './errors'

// In-memory accessors for tokens and guest cart id to avoid circular imports
let getAuthToken: (() => string | null) | null = null
let getGuestCartId: (() => string | null) | null = null
let onUnauthorizedCallback: (() => void) | null = null

export function configureApiAuth(
  tokenGetter: () => string | null,
  onUnauthorized?: () => void,
) {
  getAuthToken = tokenGetter
  if (onUnauthorized) {
    onUnauthorizedCallback = onUnauthorized
  }
}

export function configureGuestCart(cartIdGetter: () => string | null) {
  getGuestCartId = cartIdGetter
}

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to inject Authorization and X-Cart-Id headers
axiosInstance.interceptors.request.use((config) => {
  if (getAuthToken) {
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  if (getGuestCartId) {
    const cartId = getGuestCartId()
    if (cartId) {
      config.headers['X-Cart-Id'] = cartId
    }
  }

  // Propaga o cenário de mocks ativo para o service worker (MSW)
  if (typeof localStorage !== 'undefined') {
    const scenario = localStorage.getItem('jungle-mock-scenario')
    if (scenario) {
      config.headers['X-Mock-Scenario'] = scenario
    }
  }

  return config
})

// Response interceptor to catch 401 and invoke onUnauthorizedCallback if needed
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback()
    }
    return Promise.reject(error)
  },
)

export async function apiRequest<T>(
  schema: z.ZodType<T>,
  config: AxiosRequestConfig,
): Promise<T> {
  try {
    const response = await axiosInstance.request(config)
    const result = schema.safeParse(response.data)

    if (!result.success) {
      console.error('[API] Contract schema validation failed:', result.error.format())
      throw new ApiError(response.status, {
        code: 'INVALID_RESPONSE',
        message: 'A resposta do servidor divergiu do contrato esperado.',
        details: { errors: result.error.issues },
        retryable: false,
      })
    }

    return result.data
  } catch (error) {
    throw normalizeError(error)
  }
}
