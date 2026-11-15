import type { Socket as ClientSocket } from 'socket.io-client'
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

let clientSocket: ClientSocket | null = null
const nftListeners = new Set<NftUpdatedListener>()
const orderListeners = new Set<OrderUpdatedListener>()
const ledgerListeners = new Set<LedgerListener>()
let isConnected = false

/**
 * Emite evento nft.updated para todos os clientes inscritos.
 * Quando o servidor MSW WebSocket estiver ativo, usa-o.
 * Caso contrário, notifica listeners locais (desenvolvimento).
 */
export function emitNftUpdated(event: NftUpdatedEvent): void {
  nftListeners.forEach((listener) => listener(event))
}

/**
 * Emite evento order.updated para todos os clientes inscritos.
 */
export function emitOrderUpdated(event: OrderUpdatedEvent): void {
  orderListeners.forEach((listener) => listener(event))
}

/**
 * Emite evento ledger para todos os clientes inscritos.
 */
export function emitLedgerEvent(event: LedgerEvent): void {
  ledgerListeners.forEach((listener) => listener(event))
}

/**
 * Conecta o cliente Socket.IO ao servidor simulado via MSW binding.
 */
export function connectRealtime(): ClientSocket | null {
  if (clientSocket) return clientSocket

  try {
    clientSocket = io('', {
      transports: ['websocket', 'polling'],
      forceNew: true,
    })

    clientSocket.on('connect', () => {
      isConnected = true
      console.log('[realtime] Conectado ao servidor Socket.IO (MSW binding)')
    })

    clientSocket.on('disconnect', () => {
      isConnected = false
      console.log('[realtime] Desconectado do servidor Socket.IO')
    })

    clientSocket.on('nft:updated', (event: NftUpdatedEvent) => {
      nftListeners.forEach((listener) => listener(event))
    })

    clientSocket.on('order:updated', (event: OrderUpdatedEvent) => {
      orderListeners.forEach((listener) => listener(event))
    })

    clientSocket.on('ledger:updated', (event: LedgerEvent) => {
      ledgerListeners.forEach((listener) => listener(event))
    })
  } catch {
    clientSocket = null
  }

  return clientSocket
}

/**
 * Desconecta o cliente Socket.IO.
 */
export function disconnectRealtime(): void {
  if (clientSocket) {
    clientSocket.disconnect()
    clientSocket = null
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
  clientSocket?.emit('subscribe:nft', nftId)
  nftListeners.add(listener)
  return () => {
    nftListeners.delete(listener)
  }
}

/**
 * Inscreve para receber atualizações de um pedido específico.
 */
export function subscribeToOrder(orderId: string, listener: OrderUpdatedListener): () => void {
  clientSocket?.emit('subscribe:order', orderId)
  orderListeners.add(listener)
  return () => {
    orderListeners.delete(listener)
  }
}

/**
 * Inscreve para receber atualizações do ledger.
 */
export function subscribeToLedger(listener: LedgerListener): () => void {
  clientSocket?.emit('subscribe:ledger')
  ledgerListeners.add(listener)
  return () => {
    ledgerListeners.delete(listener)
  }
}

export function getClientSocket(): ClientSocket | null {
  return clientSocket
}

export function isRealtimeConnected(): boolean {
  return isConnected
}
