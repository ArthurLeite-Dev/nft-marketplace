import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { RealtimeEvent } from '../../api/contracts/events'
import { DEFAULT_SOCKET_URL, SOCKET_PATH } from '../../realtime/config'
import { subscribeEvents } from '../events'
import { getSessionFromToken } from '../domain/session'
import { getActiveScenario, isRealtimeOnline, onRealtimeOnlineChange } from '../control'

/**
 * Servidor Socket.IO simulado, na camada de rede (MSW + @mswjs/socket.io-binding).
 *
 * O cliente real (`socket.io-client`) abre um WebSocket para o host simulado; este handler o
 * intercepta, fala o protocolo Socket.IO e entrega os eventos publicados no barramento do servidor
 * simulado (src/mocks/events.ts) — os mesmos dados que o REST serve. A UI nunca é chamada diretamente.
 *
 * Protocolo desta simulação:
 *  - cliente -> servidor: `session.attach` { token } identifica o usuário da conexão;
 *  - servidor -> cliente: `nft.updated` (público), `order.updated` e `wallet.disconnected` (somente
 *    para o dono; eventos de outro usuário nunca são entregues).
 *
 * Limitações: só o transporte WebSocket é simulado (sem long-polling); não há rooms nem
 * reconexão por sessão do Socket.IO real; um único "servidor" em memória por aba.
 */
const link = ws.link(`${DEFAULT_SOCKET_URL}${SOCKET_PATH}/`)

export const realtimeHandlers = [
  link.addEventListener('connection', (connection) => {
    // Servidor "fora do ar" (cenário de teste de reconexão): recusa a conexão.
    if (!isRealtimeOnline()) {
      connection.client.close()
      return
    }

    const io = toSocketIo(connection)
    let userId: string | null = null

    io.client.on('session.attach', (payload: unknown) => {
      const token = payload && typeof payload === 'object' ? (payload as { token?: unknown }).token : null
      userId = typeof token === 'string' ? (getSessionFromToken(token)?.session.userId ?? null) : null
    })

    const deliver = (event: RealtimeEvent, previous: RealtimeEvent | null) => {
      if (event.type !== 'nft.updated' && event.data.userId !== userId) return
      io.client.emit(event.type, event)
      if (getActiveScenario() === 'duplicate-events') {
        // Duplicata exata e, depois, uma versão ANTERIOR do mesmo recurso (fora de ordem).
        io.client.emit(event.type, event)
        if (previous && previous.type === event.type) io.client.emit(previous.type, previous)
      }
    }

    const unsubscribe = subscribeEvents(deliver)
    const offOnline = onRealtimeOnlineChange((online) => {
      if (!online) connection.client.close()
    })
    connection.client.addEventListener('close', () => {
      unsubscribe()
      offOnline()
    })
  }),
]
