import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  CartResponseSchema,
  AddItemInputSchema,
  UpdateItemInputSchema,
  type AddItemInput,
  type CartResponse,
} from '@/api/contracts/cart'

export function useCart() {
  const queryClient = useQueryClient()

  const query = useQuery<CartResponse, Error>({
    queryKey: ['cart'],
    queryFn: () =>
      apiRequest(CartResponseSchema, {
        method: 'GET',
        url: API_PATHS.cart.get,
      }),
    staleTime: 30 * 1000,
  })

  const addItem = useMutation<CartResponse, Error, AddItemInput>({
    mutationFn: (input) =>
      apiRequest(CartResponseSchema, {
        method: 'POST',
        url: API_PATHS.cart.addItem,
        data: AddItemInputSchema.parse(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
    },
  })

  const updateQuantity = useMutation<CartResponse, Error, { lineId: string; quantity: number }>({
    mutationFn: ({ lineId, quantity }) =>
      apiRequest(CartResponseSchema, {
        method: 'PATCH',
        url: API_PATHS.cart.item(lineId),
        data: UpdateItemInputSchema.parse({ quantity }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
    },
  })

  const removeLine = useMutation<CartResponse, Error, string>({
    mutationFn: (lineId) =>
      apiRequest(CartResponseSchema, {
        method: 'DELETE',
        url: API_PATHS.cart.item(lineId),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
    },
  })

  const applyCoupon = useMutation<CartResponse, Error, { code: string }>({
    mutationFn: ({ code }) =>
      apiRequest(CartResponseSchema, {
        method: 'PUT',
        url: API_PATHS.cart.coupon,
        data: { code },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
    },
  })

  const removeCoupon = useMutation<CartResponse, Error, void>({
    mutationFn: () =>
      apiRequest(CartResponseSchema, {
        method: 'DELETE',
        url: API_PATHS.cart.coupon,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data)
    },
  })

  return {
    ...query,
    addItem,
    updateQuantity,
    removeLine,
    applyCoupon,
    removeCoupon,
  }
}
