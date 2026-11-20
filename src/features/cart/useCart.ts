import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  CartResponseSchema,
  AddItemInputSchema,
  UpdateItemInputSchema,
  type AddItemInput,
  type CartResponse,
} from '@/api/contracts/cart'
import { useAuth } from '@/app/auth'
import { queryKeys } from '@/app/query-keys'

/**
 * Carrinho do visitante ou do usuário. O cache fica em ['cart', <userId|'guest'>]: o carrinho de um
 * usuário nunca é lido por outro. O servidor é a fonte dos totais; o cliente não recalcula valores.
 */
export function useCart() {
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const key = queryKeys.cart.scoped(user?.id ?? 'guest')

  const query = useQuery<CartResponse, Error>({
    queryKey: key,
    queryFn: ({ signal }) => apiRequest(CartResponseSchema, { method: 'GET', url: API_PATHS.cart.get, signal }),
    staleTime: 15 * 1000,
    enabled: !authLoading, // evita ler o carrinho com a identidade ainda indefinida
  })

  const store = (data: CartResponse) => queryClient.setQueryData(key, data)

  const addItem = useMutation<CartResponse, Error, AddItemInput>({
    mutationFn: (input) => apiRequest(CartResponseSchema, { method: 'POST', url: API_PATHS.cart.addItem, data: AddItemInputSchema.parse(input) }),
    onSuccess: store,
  })

  const updateQuantity = useMutation<CartResponse, Error, { lineId: string; quantity: number }>({
    mutationFn: ({ lineId, quantity }) =>
      apiRequest(CartResponseSchema, { method: 'PATCH', url: API_PATHS.cart.item(lineId), data: UpdateItemInputSchema.parse({ quantity }) }),
    onSuccess: store,
  })

  /** O usuário confirma o novo preço de uma linha (price-changed). */
  const acceptPrice = useMutation<CartResponse, Error, { lineId: string }>({
    mutationFn: ({ lineId }) => apiRequest(CartResponseSchema, { method: 'PATCH', url: API_PATHS.cart.item(lineId), data: { acceptPrice: true } }),
    onSuccess: store,
  })

  const removeLine = useMutation<CartResponse, Error, string>({
    mutationFn: (lineId) => apiRequest(CartResponseSchema, { method: 'DELETE', url: API_PATHS.cart.item(lineId) }),
    onSuccess: store,
  })

  const applyCoupon = useMutation<CartResponse, Error, { code: string }>({
    mutationFn: ({ code }) => apiRequest(CartResponseSchema, { method: 'PUT', url: API_PATHS.cart.coupon, data: { code } }),
    onSuccess: store,
  })

  const removeCoupon = useMutation<CartResponse, Error, void>({
    mutationFn: () => apiRequest(CartResponseSchema, { method: 'DELETE', url: API_PATHS.cart.coupon }),
    onSuccess: store,
  })

  return { ...query, addItem, updateQuantity, acceptPrice, removeLine, applyCoupon, removeCoupon }
}
