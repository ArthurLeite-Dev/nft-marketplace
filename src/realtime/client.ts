import { io } from 'socket.io-client'
import { REALTIME_EVENT_NAMES } from '@/api/contracts/events'
import { SOCKET_PATH, SOCKET_URL } from './config'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export interface RealtimeClientOptions {
  /** Token da sessão (ou null para visitante): identifica o dono dos eventos privados. */
  token: string | null
  onEvent: (raw: unknown) => void
  onStatus: (status: RealtimeStatus) => void
  /** `reconnect: true` quando houve desconexão antes: o chamador deve reconciliar com o REST. */
  onConnect: (info: { reconnect: boolean }) => void
}

/**
 * Cliente Socket.IO (socket.io-client) com ciclo de vida explícito.
 * `dispose()` remove todos os listeners e fecha a conexão (chamado ao trocar de usuário e ao desmontar).
 */
export function createRealtimeClient(options: RealtimeClientOptions): { dispose: () => void } {
  const socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 3000,
  })

  let needsReconcile = false
  options.onStatus('connecting')

  socket.on('connect', () => {
    socket.emit('session.attach', { token: options.token })
    options.onStatus('connected')
    options.onConnect({ reconnect: needsReconcile })
    needsReconcile = false
  })
  socket.on('disconnect', () => {
    needsReconcile = true
    options.onStatus('disconnected')
  })
  socket.on('connect_error', () => {
    needsReconcile = true
    options.onStatus('disconnected')
  })
  socket.io.on('reconnect_attempt', () => options.onStatus('connecting'))

  for (const name of REALTIME_EVENT_NAMES) socket.on(name, options.onEvent)

  return {
    dispose() {
      for (const name of REALTIME_EVENT_NAMES) socket.off(name, options.onEvent)
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
    },
  }
}
