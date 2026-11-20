import type { ScenarioId } from './scenarios'
import { DEFAULT_SCENARIO, SCENARIOS, SCENARIO_DESCRIPTIONS, createScenarioEffect, isScenarioId, type ScenarioEffect } from './scenarios'
import { advanceClock, clearScenarioMarks, getDb, markScenarioActivated, resetDb } from './db/store'
import { resetEventHistory } from './events'
import { resetNetworkState } from './respond'
import { applyNftUpdate, type NftUpdatePatch } from './domain/nft-updates'
import { forceDisconnectActiveWallet, settleDueOrders, settleOrderNow } from './domain/checkout'

export { SCENARIOS, SCENARIO_DESCRIPTIONS, isScenarioId }
export type { ScenarioId }

const SCENARIO_KEY = 'jungle-mock-scenario'

let memoryScenario: ScenarioId = DEFAULT_SCENARIO
const effects = new Map<ScenarioId, ScenarioEffect>()
const counters = new Map<string, number>()

function ls(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null
  } catch {
    return null
  }
}

/** Cenário ativo: persistido em localStorage para sobreviver a refresh e navegação interna. */
export function getActiveScenario(): ScenarioId {
  const stored = ls()?.getItem(SCENARIO_KEY)
  if (isScenarioId(stored)) return stored
  return memoryScenario
}

export function getEffect(id: ScenarioId = getActiveScenario()): ScenarioEffect {
  let effect = effects.get(id)
  if (!effect) {
    effect = createScenarioEffect(id)
    effects.set(id, effect)
  }
  return effect
}

/** Quantas vezes o evento `key` ocorreu desde a ativação do cenário (para cenários "na 2ª cotação"). */
export function bumpCounter(key: string): number {
  const next = (counters.get(key) ?? 0) + 1
  counters.set(key, next)
  return next
}

export function setScenario(id: ScenarioId): void {
  memoryScenario = id
  try {
    ls()?.setItem(SCENARIO_KEY, id)
  } catch {
    // ignorado: segue com o valor em memória
  }
  effects.delete(id)
  counters.clear()
  resetNetworkState()
  markScenarioActivated(id)
}

/**
 * Lê `?scenario=<id>` na carga da página e o PERSISTE. Sem isso o cenário se perdia na primeira
 * navegação interna (a query string some do endereço).
 */
export function syncScenarioFromUrl(search: string): ScenarioId {
  const wanted = new URLSearchParams(search).get('scenario')
  if (isScenarioId(wanted) && wanted !== getActiveScenario()) setScenario(wanted)
  return getActiveScenario()
}

// --- Estado de conectividade do servidor Socket.IO simulado ---
let realtimeOnline = true
const onlineListeners = new Set<(online: boolean) => void>()

export function isRealtimeOnline(): boolean {
  return realtimeOnline
}

export function setRealtimeOnline(online: boolean): void {
  if (realtimeOnline === online) return
  realtimeOnline = online
  for (const l of [...onlineListeners]) l(online)
}

export function onRealtimeOnlineChange(listener: (online: boolean) => void): () => void {
  onlineListeners.add(listener)
  return () => {
    onlineListeners.delete(listener)
  }
}

export interface MockControl {
  scenarios: readonly ScenarioId[]
  getScenario(): ScenarioId
  setScenario(id: ScenarioId): void
  /** Restaura integralmente o cenário conhecido (banco, relógio, cenário, contadores). */
  reset(): void
  /** Avança o relógio simulado e liquida pedidos vencidos (emitindo os eventos). */
  advanceClock(ms: number): void
  /** Liquida pedidos vencidos agora. */
  settleOrders(): void
  settleOrder(orderId: string): void
  /** Altera preço/disponibilidade: muda o REST e emite `nft.updated` pelo servidor Socket.IO simulado. */
  updateNft(nftId: string, patch: NftUpdatePatch): boolean
  /** Simula a carteira se desconectando (emite `wallet.disconnected`). */
  disconnectWallet(userId?: string): boolean
  /** Derruba/restaura a conexão do servidor Socket.IO simulado (teste de reconexão). */
  setRealtimeOnline(online: boolean): void
  snapshot(): ReturnType<typeof getDb>
}

export function createMockControl(): MockControl {
  return {
    scenarios: SCENARIOS,
    getScenario: () => getActiveScenario(),
    setScenario,
    reset() {
      resetDb()
      clearScenarioMarks()
      resetEventHistory()
      resetNetworkState()
      counters.clear()
      effects.clear()
      memoryScenario = DEFAULT_SCENARIO
      try {
        ls()?.removeItem(SCENARIO_KEY)
      } catch {
        // ignorado
      }
      setRealtimeOnline(true)
    },
    advanceClock(ms) {
      advanceClock(ms)
      settleDueOrders()
    },
    settleOrders() {
      settleDueOrders()
    },
    settleOrder(orderId) {
      settleOrderNow(orderId)
    },
    updateNft: (nftId, patch) => applyNftUpdate(nftId, patch).ok,
    disconnectWallet: (userId) => forceDisconnectActiveWallet(userId),
    setRealtimeOnline,
    snapshot: () => getDb(),
  }
}

declare global {
  interface Window {
    __mock?: MockControl
  }
}

/** Expõe `window.__mock` (desenvolvimento, demonstração e testes E2E). */
export function installMockControl(): MockControl {
  const control = createMockControl()
  if (typeof window !== 'undefined') window.__mock = control
  return control
}
