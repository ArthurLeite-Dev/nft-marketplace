import { z } from 'zod'
import { EthAmountSchema } from './common'
import { OrderStatusSchema } from './orders'

export const EventResourceSchema = z.object({
  type: z.enum(['nft', 'order', 'wallet', 'cart']),
  id: z.string(),
})

export const BaseEventSchema = z.object({
  eventId: z.string(), // format: "type:id:version"
  version: z.number().int().positive(),
  occurredAt: z.string(),
  resource: EventResourceSchema,
})

export const NftUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('nft.updated'),
  data: z.object({
    nftId: z.string(),
    priceEth: EthAmountSchema,
    previousPriceEth: EthAmountSchema.optional(),
    editions: z.array(
      z.object({
        id: z.string(),
        available: z.number().int().nonnegative().nullable(),
        isSoldOut: z.boolean(),
      }),
    ),
  }),
})

export const OrderUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('order.updated'),
  data: z.object({
    orderId: z.string(),
    userId: z.string(),
    status: OrderStatusSchema,
    transactionHash: z.string(),
    failureReason: z.string().optional(),
    settledAt: z.string(),
  }),
})

export const WalletDisconnectedEventSchema = BaseEventSchema.extend({
  type: z.literal('wallet.disconnected'),
  data: z.object({
    connectionId: z.string(),
    userId: z.string(),
    address: z.string(),
    reason: z.string(),
  }),
})

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  NftUpdatedEventSchema,
  OrderUpdatedEventSchema,
  WalletDisconnectedEventSchema,
])

export type NftUpdatedEvent = z.infer<typeof NftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEventSchema>
export type WalletDisconnectedEvent = z.infer<typeof WalletDisconnectedEventSchema>
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>
