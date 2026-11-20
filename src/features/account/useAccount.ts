import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import { useAuth } from '@/app/auth'
import { queryKeys } from '@/app/query-keys'
import { useFavorites } from '@/features/favorites/useFavorite'

const WalletEntrySchema = z.object({
  nickname: z.string().optional(),
  displayName: z.string().optional(),
  profileName: z.string().optional(),
  network: z.string(),
  address: z.string(),
  walletType: z.string().optional(),
  referralCode: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  ensName: z.string().nullable().optional(),
})

const ProfileUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable().optional(),
  ensName: z.string().nullable().optional(),
  wallets: z.object({
    principal: WalletEntrySchema.nullable().optional(),
    secundaria: WalletEntrySchema.nullable().optional(),
  }),
})
export type AccountProfile = z.infer<typeof ProfileUserSchema>

const ProfileResponseSchema = z.object({ ok: z.boolean(), user: ProfileUserSchema })
const OkSchema = z.object({ ok: z.boolean() })
const WalletResponseSchema = z.object({ ok: z.boolean(), wallet: WalletEntrySchema })
const AvatarResponseSchema = z.object({ ok: z.boolean(), avatarUrl: z.string().nullable() })

export interface SaveWalletVars {
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
}

export function useAccount() {
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading, updateUser } = useAuth()
  const userId = user?.id
  const profileKey = userId ? queryKeys.user.profile(userId) : (['u', 'none', 'profile'] as const)
  const favorites = useFavorites()

  const getProfile = useQuery<AccountProfile, Error>({
    queryKey: profileKey,
    queryFn: ({ signal }) => apiRequest(ProfileResponseSchema, { method: 'GET', url: API_PATHS.account.profile, signal }).then((r) => r.user),
    staleTime: 30 * 1000,
    enabled: !!userId && !authLoading,
  })

  const updateProfile = useMutation<AccountProfile, Error, { username?: string; email?: string; ensName?: string | null }>({
    mutationFn: (input) => apiRequest(ProfileResponseSchema, { method: 'PATCH', url: API_PATHS.account.profile, data: input }).then((r) => r.user),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data)
      updateUser({ username: data.username, email: data.email })
    },
  })

  const changePassword = useMutation<void, Error, { currentPassword: string; newPassword: string; confirmPassword: string }>({
    mutationFn: (input) => apiRequest(OkSchema, { method: 'POST', url: API_PATHS.account.password, data: input }).then(() => undefined),
  })

  const upsertWallet = useMutation<z.infer<typeof WalletEntrySchema>, Error, SaveWalletVars>({
    mutationFn: (input) => apiRequest(WalletResponseSchema, { method: 'PUT', url: API_PATHS.account.walletSlot(input.slot), data: input }).then((r) => r.wallet),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  })

  /** `avatarUrl` é um data URL de imagem (PNG/JPEG/WebP) ou null para remover. */
  const saveAvatar = useMutation<string | null, Error, string | null>({
    mutationFn: (avatarUrl) =>
      avatarUrl === null
        ? apiRequest(AvatarResponseSchema, { method: 'DELETE', url: API_PATHS.account.avatar }).then((r) => r.avatarUrl)
        : apiRequest(AvatarResponseSchema, { method: 'PUT', url: API_PATHS.account.avatar, data: { avatarUrl } }).then((r) => r.avatarUrl),
    onSuccess: (avatarUrl) => {
      void queryClient.invalidateQueries({ queryKey: profileKey })
      updateUser({ avatarUrl })
    },
  })

  return {
    profile: getProfile.data,
    isProfileLoading: getProfile.isPending && !!userId,
    profileError: getProfile.error,
    favorites: favorites.favorites,
    isFavoritesLoading: favorites.isLoading,
    favoritesError: favorites.error,
    refetchFavorites: favorites.refetch,
    toggleFavorite: favorites.toggleFavorite,
    isTogglingFavorite: favorites.isToggling,
    updateProfile,
    changePassword,
    upsertWallet,
    isUpdatingWallet: upsertWallet.isPending,
    saveAvatar,
  }
}
