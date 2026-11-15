import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { FavoritesResponseSchema } from '@/api/contracts/favorites'
import { type NftSummary } from '@/api/contracts/nfts'
import { z } from 'zod'

const ToggleFavoriteResponseSchema = z.object({
  ok: z.boolean(),
  favorited: z.boolean(),
})

type FavoriteContext = {
  previous: NftSummary[]
  nftId: string
  isNowFavorited: boolean
} | undefined

export function useFavorites(enabled = true) {
  const queryClient = useQueryClient()

  const query = useQuery<NftSummary[], Error>({
    queryKey: ['favorites'],
    queryFn: () =>
      apiRequest(FavoritesResponseSchema, {
        method: 'GET',
        url: API_PATHS.favorites.list,
      }).then((res) => res.items),
    staleTime: 30 * 1000,
    enabled,
  })

  const toggleFavorite = useMutation<
    { favorited: boolean },
    Error,
    { nftId: string; currentlyFavorited: boolean },
    FavoriteContext
  >({
    mutationFn: ({ nftId }) =>
      apiRequest(ToggleFavoriteResponseSchema, {
        method: 'PUT',
        url: API_PATHS.favorites.item(nftId),
      }),
    onMutate: async ({ nftId, currentlyFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previous = queryClient.getQueryData<NftSummary[]>(['favorites']) ?? []
      const isNowFavorited = !currentlyFavorited

      queryClient.setQueryData<NftSummary[]>(['favorites'], (old) => {
        const items = old ?? []
        if (isNowFavorited) {
          return items.some((i) => i.id === nftId) ? items : [...items, { id: nftId } as NftSummary]
        }
        return items.filter((i) => i.id !== nftId)
      })

      return { previous, nftId, isNowFavorited }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(['favorites'], context.previous)
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  return {
    favorites: query.data ?? [],
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    toggleFavorite,
    isToggling: toggleFavorite.isPending,
  }
}
