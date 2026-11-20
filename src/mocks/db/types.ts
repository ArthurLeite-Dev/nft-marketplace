export type Network = 'Ethereum' | 'Polygon' | 'Base'

export type EditionType = 'unique_1_of_1' | 'limited_10' | 'limited_50' | 'open'

export type OrderStatus = 'pending' | 'confirmed' | 'refused'

export type CartLineStatus = 'available' | 'price-changed' | 'unavailable'

export type ScenarioId =
  | 'default'
  | 'empty'
  | 'slow'
  | 'out-of-order'
  | 'offline'
  | 'server-error'
  | 'flaky'
  | 'forbidden'
  | 'session-expired'
  | 'coupon-expired'
  | 'price-changed'
  | 'sold-out'
  | 'wallet-rejected'
  | 'order-timeout'
  | 'payment-refused'
  | 'duplicate-events'

export interface DbUser {
  id: string
  username: string
  email: string
  passwordHash: string
  salt: string
  wallets: {
    principal: DbWallet | null
    secundaria: DbWallet | null
  }
  favorites: string[]
  avatarUrl?: string | null
  createdAt: string
}

export interface DbWallet {
  slot: 'principal' | 'secundaria'
  nickname: string
  displayName: string
  profileName: string
  network: Network
  address: string
  walletType: string
  referralCode: string | null
  email: string | null
  ensName: string | null
}

export interface DbArtwork {
  url: string
  alt: string
  width?: number
  height?: number
}

export interface DbEdition {
  id: string
  nftId: string
  type: EditionType
  label: string
  priceEth: string
  previousPriceEth?: string
  available: number | null
  maxPerOrder: number
  isSoldOut: boolean
}

export interface DbNft {
  id: string
  name: string
  collection: string
  network: Network
  priceEth: string
  previousPriceEth?: string
  artwork: DbArtwork
  isRare: boolean
  isNew: boolean
  isTrending: boolean
  defaultEditionId: string
  createdAt: string
  editions: DbEdition[]
  description: string
  creator: {
    id: string
    name: string
    avatarUrl?: string | null
    verified: boolean
  }
  rating: {
    average: number
    count: number
  }
  gallery: DbArtwork[]
}

export interface DbCartLine {
  lineId: string
  nftId: string
  editionId: string
  quantity: number
  seenPriceEth?: string
}

export interface DbCartTotals {
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
}

export interface DbCart {
  id: string
  userId: string | null
  guestCartId: string | null
  version: number
  lines: DbCartLine[]
  couponCode: string | null
  couponDiscountBp: number
  network: Network | null
  updatedAt: string
}

export interface DbOrderLine {
  lineId: string
  nftId: string
  editionId: string
  name: string
  editionLabel: string
  unitPriceEth: string
  quantity: number
  subtotalEth: string
}

export interface DbCollector {
  displayName: string
  username: string
  email: string
  profileName: string | null
  secondaryWallet: string | null
  walletType: string | null
  referralCode: string | null
  ensName: string | null
  note: string | null
}

export interface DbQuoteLine {
  lineId: string
  nftId: string
  editionId: string
  name: string
  editionLabel: string
  unitPriceEth: string
  quantity: number
  subtotalEth: string
}

/** Cotação emitida pelo servidor simulado; é a referência para finalizar o pedido. */
export interface DbQuote {
  id: string
  userId: string
  cartId: string
  cartVersion: number
  network: Network
  lines: DbQuoteLine[]
  couponCode: string | null
  couponDiscountBp: number
  totals: DbCartTotals
  /** Assinatura do conteúdo (preços, quantidades, cupom, taxa) usada para detectar cotação desatualizada. */
  fingerprint: string
  createdAt: string
  expiresAt: string
}

export interface DbWalletConnection {
  id: string
  userId: string
  provider: string
  address: string
  network: Network
  connectedAt: string
  expiresAt: string
  disconnectedAt: string | null
}

export interface DbOrder {
  id: string
  userId: string
  idempotencyKey: string
  requestHash: string
  quoteId: string
  status: OrderStatus
  network: Network
  provider: string
  walletAddress: string
  /** Só existe para pedido confirmado. */
  transactionHash: string | null
  failureReason: string | null
  /** Snapshot imutável: alterações posteriores no catálogo não afetam o recibo. */
  lines: DbOrderLine[]
  couponCode: string | null
  couponDiscountBp: number
  totals: DbCartTotals
  collector: DbCollector
  createdAt: string
  /** Instante (relógio simulado) a partir do qual o pedido pode ser liquidado. */
  settleAt: string
  /** Desfecho decidido na criação, conforme o cenário ativo. */
  outcome: 'confirmed' | 'refused'
  settledAt: string | null
}

export interface DbSession {
  token: string
  userId: string
  issuedAt: string
  expiresAt: string
}

export interface DbScenarioMark {
  scenarioId: ScenarioId
  activatedAt: string
}

export interface DbClock {
  offsetMs: number
}

export interface DbSchema {
  version: number
  /** Contador para ids determinísticos (ord_000001, ...). */
  seq: number
  users: DbUser[]
  nfts: DbNft[]
  carts: DbCart[]
  orders: DbOrder[]
  quotes: DbQuote[]
  walletConnections: DbWalletConnection[]
  sessions: DbSession[]
  scenarioMarks: DbScenarioMark[]
  clock: DbClock
  /** Versão monotônica por recurso ("nft:nft_01", "order:ord_000001") para eventos em tempo real. */
  versions: Record<string, number>
}

export const SCHEMA_VERSION = 2
