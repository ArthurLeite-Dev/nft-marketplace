import { z } from 'zod'
import { CartTotalsSchema } from './cart'
import { EthAmountSchema } from './common'

export const NetworkSchema = z.enum(['Ethereum', 'Polygon', 'Base'])
export const WalletProviderSchema = z.enum(['WalletConnect', 'MetaMask', 'Coinbase'])
const EvmAddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Endereço EVM inválido')

export const QuoteRequestSchema = z.object({
  network: NetworkSchema,
  cartVersion: z.number().int().nonnegative().optional(),
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

/** Cotação: a referência de preços, taxas e disponibilidade para finalizar o pedido. */
export const QuoteResponseSchema = z.object({
  quoteId: z.string(),
  cartVersion: z.number().int().nonnegative(),
  network: NetworkSchema,
  lines: z.array(QuoteLineSnapshotSchema),
  couponCode: z.string().nullable(),
  totals: CartTotalsSchema,
  expiresAt: z.string(),
})

export const WalletConnectionRequestSchema = z.object({
  address: EvmAddressSchema,
  provider: WalletProviderSchema,
  network: NetworkSchema,
})

export const WalletConnectionResponseSchema = z.object({
  connectionId: z.string(),
  address: z.string(),
  provider: WalletProviderSchema,
  network: NetworkSchema,
  connectedAt: z.string(),
  expiresAt: z.string(),
})

/** Dados do colecionador exigidos no pagamento (campos do layout do Figma). */
export const CollectorSchema = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
  username: z.string().trim().min(3, 'Usuário deve ter ao menos 3 caracteres').max(30, 'Usuário deve ter no máximo 30 caracteres'),
  email: z.string().email('E-mail inválido'),
  profileName: z.string().optional(),
  secondaryWallet: EvmAddressSchema.optional(),
  walletType: z.string().optional(),
  referralCode: z.string().optional(),
  ensName: z.string().optional(),
  note: z.string().max(280, 'A observação deve ter no máximo 280 caracteres').optional(),
})

export const CreateOrderRequestSchema = z.object({
  quoteId: z.string().min(1),
  walletConnectionId: z.string().min(1),
  collector: CollectorSchema,
})

export type Network = z.infer<typeof NetworkSchema>
export type WalletProvider = z.infer<typeof WalletProviderSchema>
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>
export type QuoteLineSnapshot = z.infer<typeof QuoteLineSnapshotSchema>
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
export type WalletConnectionRequest = z.infer<typeof WalletConnectionRequestSchema>
export type WalletConnectionResponse = z.infer<typeof WalletConnectionResponseSchema>
export type Collector = z.infer<typeof CollectorSchema>
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>
