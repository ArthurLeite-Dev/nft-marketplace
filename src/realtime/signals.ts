import { useEffect, useRef } from 'react'

/**
 * Sinais de domínio emitidos DEPOIS que um evento Socket.IO foi validado e aplicado ao cache.
 * A UI os usa para mostrar avisos (ex.: "o preço mudou"); o dado em si continua vindo do cache/REST.
 */
export type RealtimeSignal =
  | { type: 'nft-changed'; nftId: string; previousPriceEth?: string; priceEth: string; soldOutEditionIds: string[] }
  | { type: 'order-settled'; orderId: string; status: 'confirmed' | 'refused' | 'pending' }
  | { type: 'wallet-disconnected'; connectionId: string }

type Listener = (signal: RealtimeSignal) => void
const listeners = new Set<Listener>()

export function emitSignal(signal: RealtimeSignal): void {
  for (const l of [...listeners]) l(signal)
}

export function subscribeSignal(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useRealtimeSignal(handler: Listener): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => subscribeSignal((s) => ref.current(s)), [])
}
