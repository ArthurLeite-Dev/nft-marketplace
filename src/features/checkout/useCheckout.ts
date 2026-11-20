import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  QuoteResponseSchema,
  WalletConnectionResponseSchema,
  type CreateOrderRequest,
  type Network,
  type QuoteResponse,
  type WalletConnectionRequest,
  type WalletConnectionResponse,
} from '@/api/contracts/checkout'
import { OrderEnvelopeSchema, OrderResponseSchema, OrdersListSchema, type OrderEnvelope, type OrderResponse } from '@/api/contracts/orders'
import { useAuth } from '@/app/auth'
import { queryKeys } from '@/app/query-keys'

/** Cotação: a referência de valores para finalizar o pedido (o servidor é a fonte, não o cliente). */
export function useCreateQuote() {
  return useMutation<QuoteResponse, Error, { network: Network }>({
    mutationFn: ({ network }) => apiRequest(QuoteResponseSchema, { method: 'POST', url: API_PATHS.checkout.quote, data: { network } }),
  })
}

export function useConnectWallet() {
  return useMutation<WalletConnectionResponse, Error, WalletConnectionRequest>({
    mutationFn: (input) => apiRequest(WalletConnectionResponseSchema, { method: 'POST', url: API_PATHS.checkout.walletConnections, data: input }),
  })
}

export function useDisconnectWallet() {
  return useMutation<unknown, Error, { connectionId: string }>({
    mutationFn: ({ connectionId }) => apiRequest(z.object({ ok: z.boolean() }), { method: 'DELETE', url: API_PATHS.checkout.walletConnection(connectionId) }),
  })
}

/**
 * Criação idempotente do pedido. A MESMA `idempotencyKey` com o MESMO corpo recupera o mesmo pedido
 * (reenvio após timeout/clique repetido); corpo diferente com a mesma chave gera conflito.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation<OrderEnvelope, Error, { idempotencyKey: string; body: CreateOrderRequest }>({
    mutationFn: ({ idempotencyKey, body }) =>
      apiRequest(OrderEnvelopeSchema, {
        method: 'POST',
        url: API_PATHS.orders.create,
        headers: { 'Idempotency-Key': idempotencyKey },
        data: body,
      }),
    onSuccess: ({ order }) => {
      if (user) {
        queryClient.setQueryData(queryKeys.user.order(user.id, order.id), order)
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.orders(user.id) })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.root })
    },
  })
}

/** Estado do pedido. Enquanto estiver pendente relê periodicamente (rede de segurança além do evento order.updated). */
export function useOrder(orderId: string | undefined) {
  const { user, isLoading } = useAuth()
  const userId = user?.id
  return useQuery<OrderResponse, Error>({
    queryKey: userId && orderId ? queryKeys.user.order(userId, orderId) : ['u', 'none', 'order'],
    queryFn: ({ signal }) => apiRequest(OrderResponseSchema, { method: 'GET', url: API_PATHS.orders.detail(orderId!), signal }),
    enabled: !!userId && !!orderId && !isLoading,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2000 : false),
    staleTime: 0,
  })
}

/** Pedidos pendentes do usuário: base da recuperação após refresh ou reconexão. */
export function usePendingOrders() {
  const { user, isLoading } = useAuth()
  const userId = user?.id
  return useQuery<OrderResponse[], Error>({
    queryKey: userId ? [...queryKeys.user.orders(userId), 'pending'] : ['u', 'none', 'orders'],
    queryFn: ({ signal }) =>
      apiRequest(OrdersListSchema, { method: 'GET', url: `${API_PATHS.orders.myOrders}?status=pending`, signal }).then((r) => r.orders),
    enabled: !!userId && !isLoading,
    staleTime: 0,
  })
}
