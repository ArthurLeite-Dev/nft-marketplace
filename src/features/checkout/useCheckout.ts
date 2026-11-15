import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  QuoteResponseSchema,
  WalletConnectionResponseSchema,
  type QuoteResponse,
  type WalletConnectionResponse,
} from '@/api/contracts/checkout'
import { z } from 'zod'

const CreateOrderResponseSchema = z.object({
  ok: z.boolean(),
  order: z.object({
    id: z.string(),
    status: z.enum(['pending', 'confirmed', 'refused']),
    totals: z.object({
      subtotalEth: z.string(),
      discountEth: z.string(),
      networkFeeEth: z.string(),
      totalEth: z.string(),
    }),
    transactionHash: z.string(),
    failureReason: z.string().nullable(),
    createdAt: z.string(),
    settledAt: z.string().nullable(),
  }),
  created: z.boolean(),
})

const PendingOrdersSchema = z.object({
  ok: z.boolean(),
  orders: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['pending', 'confirmed', 'refused']),
      totals: z.any(),
      transactionHash: z.string(),
      failureReason: z.string().nullable(),
      createdAt: z.string(),
      settledAt: z.string().nullable(),
    }),
  ),
})

export type CheckoutOrder = z.infer<typeof CreateOrderResponseSchema>['order']

export function useCheckout() {
  const queryClient = useQueryClient()

  const createQuote = useMutation<QuoteResponse, Error, { network: string; cartVersion: number }>({
    mutationFn: ({ network, cartVersion }) =>
      apiRequest(QuoteResponseSchema, {
        method: 'POST',
        url: API_PATHS.checkout.quote,
        data: { network, cartVersion },
      }),
  })

  const connectWallet = useMutation<WalletConnectionResponse, Error, { address: string; provider: string; network: string }>({
    mutationFn: ({ address, provider, network }) =>
      apiRequest(WalletConnectionResponseSchema, {
        method: 'POST',
        url: API_PATHS.checkout.walletConnections,
        data: { address, provider, network },
      }),
  })

  const createOrder = useMutation<
    { ok: boolean; order: CheckoutOrder; created: boolean },
    Error,
    {
      idempotencyKey: string
      network: string
      provider: string
      walletAddress: string
      quote: QuoteResponse
    }
  >({
    mutationFn: ({ idempotencyKey, network, provider, walletAddress, quote }) =>
      apiRequest(CreateOrderResponseSchema, {
        method: 'POST',
        url: API_PATHS.orders.create,
        data: {
          idempotencyKey,
          network,
          provider,
          walletAddress,
          quote,
          scenarioOutcome: 'pending',
        },
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }),
    onSuccess: (result) => {
      if (result.created) {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['cart'] })
      }
    },
  })

  const getPendingOrders = useQuery<CheckoutOrder[], Error>({
    queryKey: ['orders', 'pending'],
    queryFn: () =>
      apiRequest(PendingOrdersSchema, {
        method: 'GET',
        url: `${API_PATHS.orders.myOrders}?status=pending`,
      }).then((res) => res.orders),
    enabled: false,
  })

  return {
    createQuote,
    connectWallet,
    createOrder,
    getPendingOrders,
  }
}
