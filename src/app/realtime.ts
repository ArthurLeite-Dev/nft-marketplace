import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

export interface NftUpdatedEvent {
  nftId: string
  priceEth: string
  previousPriceEth?: string
  isSoldOut?: boolean
}

export interface OrderUpdatedEvent {
  orderId: string
  status: 'pending' | 'confirmed' | 'refused'
  totalEth: string
}

export interface LedgerEvent {
  type: 'payment' | 'refund' | 'fee'
  amountEth: string
  currency: string
  timestamp: string
}

type NftUpdatedListener = (event: NftUpdatedEvent) => void
type OrderUpdatedListener = (event: OrderUpdatedEvent) => void
type LedgerListener = (event: LedgerEvent) => void

let socket: Socket | null = null
const nftListeners = new Set<NftUpdatedListener>()
const orderListeners = new Set<OrderUpdatedListener>()
const ledgerListeners = new Set<LedgerListener>()
let isConnected = false

/**
 * Conecta ao servidor Socket.IO via MSW binding.
 * Em ambiente de teste/demo, funciona como mock quando não há servidor real.
 */
export function connectRealtime(): Socket | null {
  if (socket) return socket

  try {
    socket = io('', {
      transports: ['websocket', 'polling'],
      forceNew: true,
    })

    socket.on('connect', () => {
      isConnected = true
      console.log('[realtime] Conectado ao servidor Socket.IO')
    })

    socket.on('disconnect', () => {
      isConnected = false
      console.log('[realtime] Desconectado do servidor Socket.IO')
    })

    socket.on('nft:updated', (event: NftUpdatedEvent) => {
      nftListeners.forEach((listener) => listener(event))
    })

    socket.on('order:updated', (event: OrderUpdatedEvent) => {
      orderListeners.forEach((listener) => listener(event))
    })

    socket.on('ledger:updated', (event: LedgerEvent) => {
      ledgerListeners.forEach((listener) => listener(event))
    })
  } catch {
    // Socket.IO não disponível - continuar sem tempo real
    socket = null
  }

  return socket
}

/**
 * Desconecta do servidor Socket.IO.
 */
export function disconnectRealtime(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  isConnected = false
  nftListeners.clear()
  orderListeners.clear()
  ledgerListeners.clear()
}

/**
 * Inscreve para receber atualizações de um NFT específico.
 */
export function subscribeToNft(nftId: string, listener: NftUpdatedListener): () => void {
  socket?.emit('subscribe:nft', nftId)
  nftListeners.add(listener)
  return () => {
    nftListeners.delete(listener)
  }
}

/**
 * Inscreve para receber atualizações de um pedido específico.
 */
export function subscribeToOrder(orderId: string, listener: OrderUpdatedListener): () => void {
  socket?.emit('subscribe:order', orderId)
  orderListeners.add(listener)
  return () => {
    orderListeners.delete(listener)
  }
}

/**
 * Inscreve para receber atualizações do ledger.
 */
export function subscribeToLedger(listener: LedgerListener): () => void {
  socket?.emit('subscribe:ledger')
  ledgerListeners.add(listener)
  return () => {
    ledgerListeners.delete(listener)
  }
}

/**
 * Retorna a instância do socket (pode ser null se não conectado).
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Retorna se o tempo real está conectado.
 */
export function isRealtimeConnected(): boolean {
  return isConnected
}
