import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth'
import { createRealtimeClient, type RealtimeStatus } from './client'
import { createEventProcessor } from './event-processor'
import { applyRealtimeEvent, reconcileActiveQueries } from './apply-event'

const RealtimeStatusContext = createContext<RealtimeStatus>('connecting')

export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeStatusContext)
}

/**
 * Mantém UMA conexão Socket.IO por identidade (visitante ou usuário). Ao trocar de usuário, a
 * conexão anterior é encerrada e o histórico de eventos descartado: eventos de uma sessão anterior
 * não chegam a outro usuário. Ao reconectar, os recursos ativos são relidos do REST.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { user, token, isLoading } = useAuth()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const userId = user?.id ?? null

  useEffect(() => {
    if (isLoading) return // espera a sessão ser restaurada para saber quem é o dono da conexão
    const processor = createEventProcessor()
    processor.setUser(userId)
    const client = createRealtimeClient({
      token: userId ? token : null,
      onStatus: setStatus,
      onConnect: ({ reconnect }) => {
        if (reconnect) void reconcileActiveQueries(queryClient)
      },
      onEvent: (raw) => {
        const decision = processor.process(raw)
        if (decision.apply) applyRealtimeEvent(queryClient, decision.event)
      },
    })
    return () => client.dispose()
  }, [isLoading, userId, token, queryClient])

  return <RealtimeStatusContext.Provider value={status}>{children}</RealtimeStatusContext.Provider>
}
