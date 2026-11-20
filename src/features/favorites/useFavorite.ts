import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { FavoritesResponseSchema, type FavoritesResponse } from '@/api/contracts/favorites'
import type { NftDetail, NftSummary } from '@/api/contracts/nfts'
import { useAuth } from '@/app/auth'
import { queryKeys } from '@/app/query-keys'
import { announce } from '@/lib/announce'

const ToggleFavoriteResponseSchema = z.object({ ok: z.boolean().optional(), favorited: z.boolean() })

interface ToggleVars {
  nftId: string
  currentlyFavorited: boolean
}
interface ToggleContext {
  previous: FavoritesResponse | undefined
}

/**
 * Favoritos do usuário autenticado (cache sob ['u', userId, 'favorites']).
 * `toggleFavorite` é a atualização OTIMISTA do projeto: a UI muda na hora e, se a API falhar,
 * o estado anterior é restaurado (rollback) e o usuário é avisado.
 */
export function useFavorites() {
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const userId = user?.id
  const key = userId ? queryKeys.user.favorites(userId) : null

  const query = useQuery<FavoritesResponse, Error>({
    queryKey: key ?? ['u', 'none', 'favorites'],
    queryFn: ({ signal }) => apiRequest(FavoritesResponseSchema, { method: 'GET', url: API_PATHS.favorites.list, signal }),
    staleTime: 30 * 1000,
    enabled: !!userId && !authLoading,
  })

  const toggleFavorite = useMutation<{ favorited: boolean }, Error, ToggleVars, ToggleContext>({
    mutationFn: ({ nftId, currentlyFavorited }) =>
      apiRequest(ToggleFavoriteResponseSchema, {
        method: currentlyFavorited ? 'DELETE' : 'PUT',
        url: API_PATHS.favorites.item(nftId),
      }),
    onMutate: async ({ nftId, currentlyFavorited }) => {
      if (!key) return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      const known: NftSummary | undefined = queryClient.getQueryData<NftDetail>(queryKeys.nft.detail(nftId))
      queryClient.setQueryData<FavoritesResponse>(key, (old) => {
        const base: FavoritesResponse = old ?? { items: [], nftIds: [], updatedAt: new Date().toISOString() }
        if (currentlyFavorited) {
          return { ...base, nftIds: base.nftIds.filter((id) => id !== nftId), items: base.items.filter((i) => i.id !== nftId) }
        }
        return {
          ...base,
          nftIds: base.nftIds.includes(nftId) ? base.nftIds : [...base.nftIds, nftId],
          items: known && !base.items.some((i) => i.id === nftId) ? [...base.items, known] : base.items,
        }
      })
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (key && context) queryClient.setQueryData(key, context.previous)
      announce('Não foi possível atualizar os favoritos. A alteração foi desfeita.', 'assertive')
    },
    onSettled: () => (key ? queryClient.invalidateQueries({ queryKey: key }) : undefined),
  })

  const favoriteIds = query.data?.nftIds ?? []
  return {
    favorites: query.data?.items ?? [],
    favoriteIds,
    isFavorite: (nftId: string) => favoriteIds.includes(nftId),
    isLoading: query.isPending && !!userId,
    error: query.error,
    refetch: query.refetch,
    toggleFavorite,
    isToggling: toggleFavorite.isPending,
  }
}
