import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'
import { API_PATHS } from '@/api/paths'
import {
  UserSummarySchema,
  type UserSummary,
} from '@/api/contracts/auth'
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
    updateProfile,
    changePassword,
    upsertWallet,
    isUpdatingWallet: upsertWallet.isPending,
  }
}
