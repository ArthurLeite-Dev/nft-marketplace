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

/**
 * Simula um servidor Socket.IO para ambiente de teste/demo.
 * Em produção, este seria substituído por uma conexão real com Socket.IO server.
 */
export class MockSocketIOServer {
  private nftListeners = new Set<(event: NftUpdatedEvent) => void>()
  private orderListeners = new Set<(event: OrderUpdatedEvent) => void>()
  private ledgerListeners = new Set<(event: LedgerEvent) => void>()

  emitNftUpdated(event: NftUpdatedEvent): void {
    this.nftListeners.forEach((listener) => listener(event))
  }

  emitOrderUpdated(event: OrderUpdatedEvent): void {
    this.orderListeners.forEach((listener) => listener(event))
  }

  emitLedgerEvent(event: LedgerEvent): void {
    this.ledgerListeners.forEach((listener) => listener(event))
  }

  onNftUpdated(listener: (event: NftUpdatedEvent) => void): () => void {
    this.nftListeners.add(listener)
    return () => this.nftListeners.delete(listener)
  }

  onOrderUpdated(listener: (event: OrderUpdatedEvent) => void): () => void {
    this.orderListeners.add(listener)
    return () => this.orderListeners.delete(listener)
  }

  onLedgerUpdated(listener: (event: LedgerEvent) => void): () => void {
    this.ledgerListeners.add(listener)
    return () => this.ledgerListeners.delete(listener)
  }
}

export const mockSocketIOServer = new MockSocketIOServer()
