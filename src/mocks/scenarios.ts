import type { ScenarioId } from './db/types'
export type { ScenarioId }

export const SCENARIOS: ScenarioId[] = [
  'default',
  'empty',
  'slow',
  'out-of-order',
  'offline',
  'server-error',
  'flaky',
  'forbidden',
  'session-expired',
  'coupon-expired',
  'price-changed',
  'sold-out',
  'wallet-rejected',
  'order-timeout',
  'payment-refused',
  'duplicate-events',
]

export const SCENARIO_DESCRIPTIONS: Record<ScenarioId, string> = {
  default: 'Tudo funciona; latência 120–400 ms',
  empty: 'Listagem, relacionados e recomendações vazios',
  slow: 'Latência 1,5–3 s (skeletons)',
  'out-of-order': 'Latência 50–2500 ms (respostas fora de ordem)',
  offline: 'Falha de conexão (erro de rede) em tudo',
  'server-error': '503 em tudo',
  flaky: 'Cada requisição falha 3× (503) e funciona na 4ª tentativa',
  forbidden: 'Rotas autenticadas respondem 403',
  'session-expired': 'Sessões abertas antes da ativação respondem SESSION_EXPIRED',
  'coupon-expired': 'Todo cupom é recusado como vencido (COUPON_EXPIRED)',
  'price-changed': 'O preço do 1º item do carrinho sobe na 2ª cotação (e emite nft.updated)',
  'sold-out': 'A edição do 1º item esgota na 2ª cotação (e emite nft.updated)',
  'wallet-rejected': 'A 1ª conexão de carteira é recusada (WALLET_REJECTED)',
  'order-timeout': 'O pedido é criado, mas a 1ª resposta se perde; reenviar com a mesma chave recupera o mesmo pedido',
  'payment-refused': 'Pedidos criados com o cenário são liquidados como recusados',
  'duplicate-events': 'Cada evento Socket.IO é reenviado e uma versão anterior do recurso chega depois',
}

// mulberry32 PRNG com semente fixa por ativação de cenário
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface LatencyRange { min: number; max: number }

const LATENCY_BY_SCENARIO: Record<ScenarioId, LatencyRange | null> = {
  default: { min: 120, max: 400 },
  empty: { min: 120, max: 400 },
  slow: { min: 1500, max: 3000 },
  'out-of-order': { min: 50, max: 2500 },
  offline: null,
  'server-error': { min: 120, max: 400 },
  flaky: { min: 120, max: 400 },
  forbidden: { min: 120, max: 400 },
  'session-expired': { min: 120, max: 400 },
  'coupon-expired': { min: 120, max: 400 },
  'price-changed': { min: 120, max: 400 },
  'sold-out': { min: 120, max: 400 },
  'wallet-rejected': { min: 120, max: 400 },
  'order-timeout': { min: 120, max: 400 },
  'payment-refused': { min: 120, max: 400 },
  'duplicate-events': { min: 120, max: 400 },
}

export interface ScenarioEffect {
  id: ScenarioId
  active: boolean
  activatedAt: string | null
  seed: number
  rand: () => number
  latencyMs: () => number | null
  failConnection: boolean
  serverError: boolean
  flaky: boolean
}

export function createScenarioEffect(id: ScenarioId): ScenarioEffect {
  const seed = id.charCodeAt(0) * 131 + id.length * 17
  const rand = mulberry32(seed)
  const range = LATENCY_BY_SCENARIO[id]
  return {
    id,
    active: false,
    activatedAt: null,
    seed,
    rand,
    latencyMs: range ? () => Math.floor(range.min + rand() * (range.max - range.min)) : () => null,
    failConnection: id === 'offline',
    serverError: id === 'server-error',
    flaky: id === 'flaky',
  }
}

export const DEFAULT_SCENARIO: ScenarioId = 'default'

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value)
}
