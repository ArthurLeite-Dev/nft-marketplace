import { z } from 'zod'
import { CartTotalsSchema } from './cart'
import { NetworkSchema, QuoteLineSnapshotSchema, WalletProviderSchema } from './checkout'

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'refused'])

const CollectorSnapshotSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  profileName: z.string().nullable().optional(),
  secondaryWallet: z.string().nullable().optional(),
  walletType: z.string().nullable().optional(),
  referralCode: z.string().nullable().optional(),
  ensName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
})

/**
 * Pedido. `lines`, `totals` e `collector` são um snapshot imutável do que foi confirmado:
 * alterações posteriores no catálogo não modificam o recibo.
 * `transactionHash` só existe para pedido confirmado.
 */
export const OrderResponseSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  status: OrderStatusSchema,
  network: NetworkSchema,
  provider: WalletProviderSchema,
  walletAddress: z.string(),
  transactionHash: z.string().nullable(),
  lines: z.array(QuoteLineSnapshotSchema),
  couponCode: z.string().nullable(),
  couponDiscountBp: z.number().int().nonnegative().optional(),
  totals: CartTotalsSchema,
  collector: CollectorSnapshotSchema.optional(),
  quoteId: z.string().optional(),
  version: z.number().int().nonnegative().optional(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string(),
  settledAt: z.string().nullable(),
})

/** `created: false` indica que a mesma chave de idempotência recuperou um pedido já existente. */
export const OrderEnvelopeSchema = z.object({
  order: OrderResponseSchema,
  created: z.boolean(),
})

export const OrdersListSchema = z.object({
  orders: z.array(OrderResponseSchema),
})

export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type OrderResponse = z.infer<typeof OrderResponseSchema>
export type OrderEnvelope = z.infer<typeof OrderEnvelopeSchema>
