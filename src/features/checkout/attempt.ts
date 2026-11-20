import type { CreateOrderRequest } from '@/api/contracts/checkout'

/**
 * Tentativa de pedido em andamento.
 *
 * A chave de idempotência pertence à TENTATIVA, não ao clique: é gerada uma vez e reutilizada
 * enquanto o conteúdo (cotação, carteira e dados do colecionador) for o mesmo. Assim, clique
 * repetido ou reenvio após timeout/refresh recupera o MESMO pedido em vez de criar outro.
 * Se qualquer parte do conteúdo mudar, nasce uma nova tentativa com nova chave.
 * Fica em sessionStorage, por usuário: sobrevive ao refresh e nunca vaza para outra conta.
 */
export interface CheckoutAttempt {
  key: string
  body: CreateOrderRequest
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const attemptKey = (userId: string) => `jungle-checkout-attempt:${userId}`
const draftKey = (userId: string) => `jungle-checkout-collector:${userId}`

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
}

export function sameBody(a: CreateOrderRequest, b: CreateOrderRequest): boolean {
  return stableJson(a) === stableJson(b)
}

/** Reaproveita a chave se o conteúdo é idêntico; caso contrário cria uma nova tentativa. */
export function resolveAttempt(existing: CheckoutAttempt | null, body: CreateOrderRequest, newKey: () => string): CheckoutAttempt {
  if (existing && sameBody(existing.body, body)) return existing
  return { key: newKey(), body }
}

export function loadAttempt(storage: KeyValueStorage, userId: string): CheckoutAttempt | null {
  try {
    const raw = storage.getItem(attemptKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutAttempt
    return parsed && typeof parsed.key === 'string' && parsed.body ? parsed : null
  } catch {
    return null
  }
}

export function saveAttempt(storage: KeyValueStorage, userId: string, attempt: CheckoutAttempt): void {
  try {
    storage.setItem(attemptKey(userId), JSON.stringify(attempt))
  } catch {
    // storage indisponível: a tentativa continua válida em memória
  }
}

export function clearAttempt(storage: KeyValueStorage, userId: string): void {
  try {
    storage.removeItem(attemptKey(userId))
  } catch {
    // ignorado
  }
}

export type CollectorDraft = Record<string, string>

export function loadCollectorDraft(storage: KeyValueStorage, userId: string): CollectorDraft | null {
  try {
    const raw = storage.getItem(draftKey(userId))
    return raw ? (JSON.parse(raw) as CollectorDraft) : null
  } catch {
    return null
  }
}

export function saveCollectorDraft(storage: KeyValueStorage, userId: string, draft: CollectorDraft): void {
  try {
    storage.setItem(draftKey(userId), JSON.stringify(draft))
  } catch {
    // ignorado
  }
}

/** Remove strings vazias dos campos opcionais antes de enviar à API. */
export function toCollectorPayload(form: Record<string, string>): CreateOrderRequest['collector'] {
  const opt = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined)
  return {
    displayName: (form.displayName ?? '').trim(),
    username: (form.username ?? '').trim(),
    email: (form.email ?? '').trim(),
    profileName: opt(form.profileName),
    secondaryWallet: opt(form.secondaryWallet),
    walletType: opt(form.walletType),
    referralCode: opt(form.referralCode),
    ensName: opt(form.ensName),
    note: opt(form.note),
  }
}
