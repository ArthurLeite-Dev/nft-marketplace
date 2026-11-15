export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'AVAILABILITY_CONFLICT'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'QUOTE_EXPIRED'
  | 'QUOTE_CHANGED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'ADDRESS_IN_USE'
  | 'INVALID_CURRENT_PASSWORD'
  | 'USERNAME_TAKEN'
  | 'EMAIL_TAKEN'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'

export interface ApiErrorPayload {
  code: ApiErrorCode
  message: string
  fields?: Record<string, string>
  details?: Record<string, unknown>
  retryable?: boolean
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fields?: Record<string, string>
  readonly details?: Record<string, unknown>
  readonly retryable: boolean

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiError'
    this.status = status
    this.code = payload.code
    this.fields = payload.fields
    this.details = payload.details
    this.retryable = payload.retryable ?? isStatusRetryable(status, payload.code)
  }
}

export function isStatusRetryable(status: number, code?: ApiErrorCode): boolean {
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return true
  if (code === 'INVALID_RESPONSE') return false
  if (status >= 500 && status <= 599) return true
  if (status === 408 || status === 429) return true
  return false
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  // Handle Axios-like errors
  if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
    const axiosErr = error as {
      response?: {
        status: number
        data?: { error?: ApiErrorPayload }
      }
      code?: string
      message?: string
    }

    if (axiosErr.response) {
      const status = axiosErr.response.status
      const errorData = axiosErr.response.data?.error

      if (errorData?.code && errorData.message) {
        return new ApiError(status, errorData)
      }

      const defaultCode: ApiErrorCode = status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN_ERROR'
      return new ApiError(status, {
        code: defaultCode,
        message: axiosErr.message || `HTTP error ${status}`,
      })
    }

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
      return new ApiError(0, {
        code: 'TIMEOUT',
        message: 'A requisição excedeu o tempo limite. Verifique sua conexão e tente novamente.',
        retryable: true,
      })
    }

    return new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão de rede.',
      retryable: true,
    })
  }

  if (error instanceof Error) {
    return new ApiError(0, {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: false,
    })
  }

  return new ApiError(0, {
    code: 'UNKNOWN_ERROR',
    message: 'Ocorreu um erro inesperado.',
    retryable: false,
  })
}
