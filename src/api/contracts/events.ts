import { z } from 'zod'
import { EthAmountSchema } from './common'
import { OrderStatusSchema } from './orders'

/**
 * Eventos Socket.IO. O NOME do evento no socket é o próprio `type` (ex.: "nft.updated") e o
 * payload é o objeto completo abaixo.
 *
 * - `eventId` é estável (`<tipo-do-recurso>:<id>@<versão>`): o cliente descarta duplicatas por ele.
 * - `version` é monotônica por recurso: o cliente ignora versões menores ou iguais à já aplicada.
 */
export const EventResourceSchema = z.object({
  type: z.enum(['nft', 'order', 'wallet', 'cart']),
  id: z.string(),
})

export const BaseEventSchema = z.object({
  eventId: z.string().min(1),
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
        priceEth: EthAmountSchema.optional(),
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
    transactionHash: z.string().nullable(),
    failureReason: z.string().nullable().optional(),
    settledAt: z.string().nullable(),
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

export const REALTIME_EVENT_NAMES = ['nft.updated', 'order.updated', 'wallet.disconnected'] as const
export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[number]

export type NftUpdatedEvent = z.infer<typeof NftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEventSchema>
export type WalletDisconnectedEvent = z.infer<typeof WalletDisconnectedEventSchema>
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>
