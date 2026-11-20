import type { ScenarioEffect } from './scenarios'

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** O que o transporte (MSW) deve fazer com uma requisição, conforme o cenário de rede ativo. */
export type NetworkPlan =
  | { kind: 'proceed'; delayMs: number }
  | { kind: 'network-error'; delayMs: number }
  | { kind: 'http-error'; delayMs: number; status: number; code: string; message: string }

const flakyAttempts = new Map<string, number>()

export function resetNetworkState(): void {
  flakyAttempts.clear()
}

/**
 * Decisão pura (sem timers) sobre latência e falhas de rede. Determinística: a latência vem de um
 * PRNG com semente fixa por cenário; o cenário `flaky` conta tentativas por requisição.
 */
export function planNetwork(effect: ScenarioEffect, requestKey: string): NetworkPlan {
  const delayMs = effect.latencyMs() ?? 60
  if (effect.failConnection) return { kind: 'network-error', delayMs }
  if (effect.serverError) {
    return { kind: 'http-error', delayMs, status: 503, code: 'SERVER_ERROR', message: 'Serviço indisponível temporariamente' }
  }
  if (effect.flaky) {
    const attempt = (flakyAttempts.get(requestKey) ?? 0) + 1
    if (attempt < 4) {
      flakyAttempts.set(requestKey, attempt)
      return { kind: 'http-error', delayMs, status: 503, code: 'SERVER_ERROR', message: 'Falha transitória, tente novamente' }
    }
    flakyAttempts.delete(requestKey)
  }
  return { kind: 'proceed', delayMs }
}
