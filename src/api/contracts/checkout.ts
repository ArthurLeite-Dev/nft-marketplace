import { z } from 'zod'
import { CartTotalsSchema } from './cart'
import { EthAmountSchema } from './common'

export const QuoteRequestSchema = z.object({
  network: z.enum(['Ethereum', 'Polygon']),
  cartVersion: z.number().int().nonnegative(),
})

export const QuoteLineSnapshotSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionLabel: z.string(),
  unitPriceEth: EthAmountSchema,
  quantity: z.number().int().positive(),
  subtotalEth: EthAmountSchema,
})

export const QuoteResponseSchema = z.object({
  quoteId: z.string(),
  cartVersion: z.number().int().nonnegative(),
  network: z.enum(['Ethereum', 'Polygon']),
  lines: z.array(QuoteLineSnapshotSchema),
  couponCode: z.string().nullable(),
  totals: CartTotalsSchema,
  expiresAt: z.string(),
})

export const WalletConnectionRequestSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  provider: z.enum(['WalletConnect', 'MetaMask', 'Coinbase']),
  network: z.enum(['Ethereum', 'Polygon']),
})

export const WalletConnectionResponseSchema = z.object({
  connectionId: z.string(),
  address: z.string(),
  provider: z.enum(['WalletConnect', 'MetaMask', 'Coinbase']),
  network: z.enum(['Ethereum', 'Polygon']),
  connectedAt: z.string(),
  expiresAt: z.string(),
})

export const CreateOrderRequestSchema = z.object({
  quoteId: z.string(),
  walletConnectionId: z.string(),
  collectorProfile: z.object({
    displayName: z.string().min(1),
    username: z.string().min(3),
    network: z.enum(['Ethereum', 'Polygon']),
    profileName: z.string().optional(),
    walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    secondaryWallet: z.string().optional(),
    walletType: z.string().optional(),
    referralCode: z.string().optional(),
    email: z.string().email(),
    ensName: z.string().optional(),
    note: z.string().max(280).optional(),
  }),
})

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>
export type QuoteLineSnapshot = z.infer<typeof QuoteLineSnapshotSchema>
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
export type WalletConnectionRequest = z.infer<typeof WalletConnectionRequestSchema>
export type WalletConnectionResponse = z.infer<typeof WalletConnectionResponseSchema>
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>
