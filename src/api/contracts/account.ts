import { z } from 'zod'

export const ProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string().optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().nullable().optional(),
  ensName: z.string().nullable().optional(),
  walletNickname: z.string().optional(),
})

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1, 'Nome de exibição é obrigatório').optional(),
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(280).optional(),
  ensName: z.string().optional().nullable(),
  walletNickname: z.string().optional(),
})

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Nova senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'Nova senha deve conter pelo menos um número'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export const WalletSlotSchema = z.enum(['principal', 'secundaria'])

export const WalletSchema = z.object({
  slot: WalletSlotSchema,
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Endereço EVM inválido'),
  network: z.enum(['Ethereum', 'Polygon', 'Base']),
  nickname: z.string().optional(),
  displayName: z.string().optional(),
  profileName: z.string().optional(),
  walletType: z.string().optional(),
  referralCode: z.string().optional(),
  email: z.string().email().optional(),
  ensName: z.string().optional(),
  updatedAt: z.string(),
})

export const WalletsResponseSchema = z.object({
  principal: WalletSchema.nullable().optional(),
  secundaria: WalletSchema.nullable().optional(),
})

export const SaveWalletInputSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Endereço EVM inválido (0x seguido de 40 caracteres hexadecimais)'),
  network: z.enum(['Ethereum', 'Polygon', 'Base']),
  nickname: z.string().optional(),
  displayName: z.string().optional(),
  profileName: z.string().optional(),
  walletType: z.string().optional(),
  referralCode: z.string().optional(),
  email: z.string().email().optional(),
  ensName: z.string().optional(),
})

export type Profile = z.infer<typeof ProfileSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>
export type WalletSlot = z.infer<typeof WalletSlotSchema>
export type Wallet = z.infer<typeof WalletSchema>
export type WalletsResponse = z.infer<typeof WalletsResponseSchema>
export type SaveWalletInput = z.infer<typeof SaveWalletInputSchema>
