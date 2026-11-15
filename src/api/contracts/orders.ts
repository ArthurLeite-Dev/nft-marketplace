import { z } from 'zod'
import { CartTotalsSchema } from './cart'
import { QuoteLineSnapshotSchema } from './checkout'

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'refused'])

export const OrderResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  network: z.enum(['Ethereum', 'Polygon']),
  provider: z.enum(['WalletConnect', 'MetaMask', 'Coinbase']),
  walletAddress: z.string(),
  transactionHash: z.string(),
  lines: z.array(QuoteLineSnapshotSchema),
  couponCode: z.string().nullable(),
  totals: CartTotalsSchema,
  failureReason: z.string().optional(),
  createdAt: z.string(),
  settledAt: z.string().nullable(),
})

export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type OrderResponse = z.infer<typeof OrderResponseSchema>
