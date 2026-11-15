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
  totals: DbCartTotals
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

export interface DbOrder {
  id: string
  userId: string
  idempotencyKey: string | null
  requestHash: string | null
  status: OrderStatus
  network: Network
  provider: string
  walletAddress: string
  transactionHash: string
  failureReason: string | null
  lines: DbOrderLine[]
  couponCode: string | null
  couponDiscountBp: number
  totals: DbCartTotals
  createdAt: string
  settledAt: string | null
}

export interface DbSession {
  token: string
  userId: string
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
  users: DbUser[]
  nfts: DbNft[]
  carts: DbCart[]
  orders: DbOrder[]
  sessions: DbSession[]
  scenarioMarks: DbScenarioMark[]
  clock: DbClock
}

export const SCHEMA_VERSION = 1

export interface DbDiff {
  nfts: { added: DbNft[]; updated: DbNft[]; removed: DbNft[] }
  orders: { added: DbOrder[]; updated: DbOrder[]; removed: DbOrder[] }
  carts: { updated: DbCart[] }
}
