import type { ScenarioEffect } from '../scenarios'
import { withNetwork } from '../respond'
import { getEffect, getActiveScenario, isScenarioId } from '../control'
import { getSessionFromToken } from '../domain/session'

export interface RequestLike {
  url: string
  headers: { get: (name: string) => string | null }
  method: string
  json?: () => Promise<unknown>
}

export function resolveScenarioEffect(request: RequestLike): ScenarioEffect {
  const header = request.headers.get('X-Mock-Scenario')
  if (header && isScenarioId(header)) {
    return getEffect(header)
  }
  const urlParam = new URL(request.url).searchParams.get('scenario')
  if (urlParam && isScenarioId(urlParam)) {
    return getEffect(urlParam)
  }
  return getEffect(getActiveScenario())
}

export function requireAuth(headers: RequestLike['headers']): { ok: true; token: string } | { ok: false; response: Promise<Response> } {
  const auth = headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(auth)
  if (!match) {
    return { ok: false, response: json(401, { error: { code: 'UNAUTHENTICATED', message: 'Token de acesso não fornecido', status: 401 } }) }
  }
  return { ok: true, token: match[1]! }
}

export function checkSession(token: string): { ok: true; userId: string } | { ok: false; response: Promise<Response> } {
  const result = getSessionFromToken(token)
  if (!result) {
    return { ok: false, response: json(401, { error: { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Faça login novamente.', status: 401 } }) }
  }
  return { ok: true, userId: result.session.userId }
}

export async function json(status: number, body: unknown): Promise<Response> {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>, details?: Record<string, unknown>, retryable = false): Response {
  return new Response(
    JSON.stringify({ error: { code, message, fields, details, retryable, status } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

export function httpStatusForCode(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR': return 422
    case 'COUPON_INVALID': return 422
    case 'COUPON_EXPIRED': return 422
    case 'UNAUTHENTICATED': return 401
    case 'SESSION_EXPIRED': return 401
    case 'FORBIDDEN': return 403
    case 'NOT_FOUND': return 404
    case 'CONFLICT': return 409
    case 'AVAILABILITY_CONFLICT': return 409
    case 'IDEMPOTENCY_KEY_REUSED': return 409
    case 'QUOTE_EXPIRED': return 410
    case 'QUOTE_CHANGED': return 409
    case 'ADDRESS_IN_USE': return 409
    case 'INVALID_CURRENT_PASSWORD': return 422
    case 'EMAIL_TAKEN': return 409
    case 'USERNAME_TAKEN': return 409
    case 'INVALID_RESPONSE': return 500
    case 'NETWORK_ERROR': return 502
    case 'TIMEOUT': return 504
    case 'SERVER_ERROR': return 503
    case 'WALLET_REJECTED': return 409
    default: return 500
  }
}

export async function withScenarioHandler(handler: () => Promise<Response>, request: RequestLike): Promise<Response> {
  const effect = resolveScenarioEffect(request)
  return withNetwork(effect, handler)
}

export function cartIdFromHeaders(headers: RequestLike['headers']): string | null {
  return headers.get('X-Cart-Id') ?? null
}

export function idempotencyKeyFromHeaders(headers: RequestLike['headers']): string | null {
  return headers.get('Idempotency-Key') ?? null
}
