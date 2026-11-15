import type { ScenarioEffect } from './scenarios'

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface NetworkCondition {
  latencyMs: number | null
  failConnection: boolean
  serverError: boolean
  flaky: boolean
  flakyAttempt: number
  onFlakyAttempt?: (attempt: number) => void
}

export function withNetwork<T>(
  effect: ScenarioEffect,
  handler: () => Promise<T>,
): Promise<T> {
  if (effect.failConnection) {
    return new Promise(() => {})
  }
  if (effect.serverError) {
    return delay(effect.latencyMs() ?? 120).then(() => {
      throw new HttpError(503, 'Indisponível temporariamente', 'SERVER_ERROR', true)
    })
  }
  if (effect.flaky) {
    effect.flakyAttempt += 1
    effect.onFlakyAttempt?.(effect.flakyAttempt)
    if (effect.flakyAttempt < 4) {
      return delay(effect.latencyMs() ?? 120).then(() => {
        throw new HttpError(503, 'Falha transitória, tente novamente', 'SERVER_ERROR', true)
      })
    }
  return delay(effect.latencyMs() ?? 120).then(handler)
  }
  return delay(effect.latencyMs() ?? 120).then(handler)
}

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly retryable: boolean
  constructor(status: number, message: string, code: string, retryable = false) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}
