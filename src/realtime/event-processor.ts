import { RealtimeEventSchema, type RealtimeEvent } from '@/api/contracts/events'

/**
 * Processador de eventos em tempo real (lógica pura, sem React nem socket).
 *
 * Garante, antes de qualquer efeito na interface:
 *  - validação do contrato (evento malformado é descartado);
 *  - deduplicação por `eventId` (duplicatas não reaplicam efeitos);
 *  - ordenação por `version` por recurso (evento antigo/fora de ordem nunca regride o estado);
 *  - isolamento de sessão (evento de outro usuário nunca é aplicado).
 */
export type EventDecision =
  | { apply: true; event: RealtimeEvent }
  | { apply: false; reason: 'invalid' | 'duplicate' | 'stale' | 'other-user' }

export interface EventProcessor {
  /** Define o usuário da sessão atual; trocar de usuário zera todo o histórico. */
  setUser(userId: string | null): void
  /** Registra uma versão já conhecida via REST, para que eventos mais antigos sejam ignorados. */
  observeVersion(resourceKey: string, version: number): void
  process(raw: unknown): EventDecision
  reset(): void
}

const MAX_REMEMBERED_EVENTS = 500

export function createEventProcessor(): EventProcessor {
  let userId: string | null = null
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  const reset = () => {
    seen.clear()
    versions.clear()
  }

  return {
    setUser(next) {
      if (next !== userId) {
        userId = next
        reset()
      }
    },
    observeVersion(resourceKey, version) {
      if (version > (versions.get(resourceKey) ?? 0)) versions.set(resourceKey, version)
    },
    process(raw) {
      const parsed = RealtimeEventSchema.safeParse(raw)
      if (!parsed.success) return { apply: false, reason: 'invalid' }
      const event = parsed.data

      // Eventos privados só valem para o usuário da sessão atual.
      if (event.type !== 'nft.updated' && event.data.userId !== userId) return { apply: false, reason: 'other-user' }

      if (seen.has(event.eventId)) return { apply: false, reason: 'duplicate' }

      const key = `${event.resource.type}:${event.resource.id}`
      if (event.version <= (versions.get(key) ?? 0)) {
        seen.add(event.eventId)
        return { apply: false, reason: 'stale' }
      }

      seen.add(event.eventId)
      if (seen.size > MAX_REMEMBERED_EVENTS) {
        const oldest = seen.values().next().value
        if (oldest !== undefined) seen.delete(oldest)
      }
      versions.set(key, event.version)
      return { apply: true, event }
    },
    reset,
  }
}
