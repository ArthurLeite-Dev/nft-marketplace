import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  UserSummarySchema,
  type UserSummary,
} from '@/api/contracts/auth'
import {
  FavoritesResponseSchema,
} from '@/api/contracts/favorites'
import { type NftSummary } from '@/api/contracts/nfts'
import { z } from 'zod'

const UpdateProfileResponseSchema = z.object({
  ok: z.boolean(),
  user: UserSummarySchema,
})

const ChangePasswordResponseSchema = z.object({
  ok: z.boolean(),
})

const UpsertWalletResponseSchema = z.object({
  ok: z.boolean(),
  wallet: z.any(),
})

const ToggleFavoriteResponseSchema = z.object({
  ok: z.boolean(),
  favorited: z.boolean(),
})

export function useAccount() {
  const queryClient = useQueryClient()

  const getProfile = useQuery<UserSummary, Error>({
    queryKey: ['profile'],
    queryFn: () =>
      apiRequest(UserSummarySchema, {
        method: 'GET',
        url: API_PATHS.account.profile,
      }),
    staleTime: 30 * 1000,
  })

  const getFavorites = useQuery<NftSummary[], Error>({
    queryKey: ['favorites'],
    queryFn: () =>
      apiRequest(FavoritesResponseSchema, {
        method: 'GET',
        url: API_PATHS.favorites.list,
      }).then((res) => res.items),
    staleTime: 30 * 1000,
  })

  const toggleFavorite = useMutation<
    { favorited: boolean },
    Error,
    { nftId: string; currentlyFavorited: boolean },
    { previous: NftSummary[] | undefined; nftId: string; isNowFavorited: boolean } | undefined
  >({
    mutationFn: ({ nftId }) =>
      apiRequest(ToggleFavoriteResponseSchema, {
        method: 'PUT',
        url: API_PATHS.favorites.item(nftId),
      }),
    onMutate: async ({ nftId, currentlyFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previous = queryClient.getQueryData<NftSummary[]>(['favorites'])
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

  const updateProfile = useMutation<UserSummary, Error, { username?: string; email?: string; displayName?: string; ensName?: string | null }>({
    mutationFn: (input) =>
      apiRequest(UpdateProfileResponseSchema, {
        method: 'PATCH',
        url: API_PATHS.account.profile,
        data: input,
      }).then((res) => res.user),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })

  const changePassword = useMutation<void, Error, { currentPassword: string; newPassword: string; confirmPassword: string }>({
    mutationFn: (input) =>
      apiRequest(ChangePasswordResponseSchema, {
        method: 'POST',
        url: API_PATHS.account.password,
        data: input,
      }).then(() => undefined),
  })

  const upsertWallet = useMutation<any, Error, {
    slot: 'principal' | 'secundaria'
    nickname: string
    displayName: string
    profileName: string
    network: string
    address: string
    walletType: string
    referralCode: string | null
    email: string | null
    ensName: string | null
  }>({
    mutationFn: (input) =>
      apiRequest(UpsertWalletResponseSchema, {
        method: 'PUT',
        url: API_PATHS.account.walletSlot(input.slot),
        data: input,
      }).then((res) => res.wallet),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  return {
    profile: getProfile.data,
    isProfileLoading: getProfile.isPending,
    profileError: getProfile.error,
    favorites: getFavorites.data ?? [],
    isFavoritesLoading: getFavorites.isPending,
    favoritesError: getFavorites.error,
    refetchFavorites: getFavorites.refetch,
    toggleFavorite,
    isTogglingFavorite: toggleFavorite.isPending,
    updateProfile,
    changePassword,
    upsertWallet,
    isUpdatingWallet: upsertWallet.isPending,
  }
}
