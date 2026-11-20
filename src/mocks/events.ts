import type { RealtimeEvent } from '../api/contracts/events'
import { mockNow, nextVersion } from './db/store'

/**
 * Barramento de eventos do servidor simulado.
 *
 * É a "origem" dos eventos: o domínio publica aqui quando o estado muda (preço/disponibilidade de
 * NFT, pedido liquidado, carteira desconectada). Quem entrega ao navegador é o servidor Socket.IO
 * simulado (src/mocks/realtime/socket-server.ts), que assina este barramento. A UI nunca é
 * notificada diretamente: o único caminho é socket.io-client -> transporte WebSocket do MSW.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type EventDraft = DistributiveOmit<RealtimeEvent, 'eventId' | 'version' | 'occurredAt'>

type Listener = (event: RealtimeEvent, previous: RealtimeEvent | null) => void

const listeners = new Set<Listener>()
const lastByResource = new Map<string, RealtimeEvent>()

export function subscribeEvents(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resourceKey(resource: { type: string; id: string }): string {
  return `${resource.type}:${resource.id}`
}

/** Atribui identidade estável (`recurso@versão`) e versão monotônica, e entrega aos assinantes. */
export function publishEvent(draft: EventDraft): RealtimeEvent {
  const key = resourceKey(draft.resource)
  const version = nextVersion(key)
  const event = {
    ...draft,
    eventId: `${key}@${version}`,
    version,
    occurredAt: mockNow().toISOString(),
  } as RealtimeEvent
  const previous = lastByResource.get(key) ?? null
  lastByResource.set(key, event)
  for (const listener of [...listeners]) {
    try {
      listener(event, previous)
    } catch (error) {
      console.error('[mocks] listener de evento falhou', error)
    }
  }
  return event
}

export function resetEventHistory(): void {
  lastByResource.clear()
}
