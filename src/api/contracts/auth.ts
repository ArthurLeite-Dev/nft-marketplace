import { z } from 'zod'

export const RegisterInputSchema = z.object({
  username: z
    .string()
    .min(3, 'Nome de usuário deve ter no mínimo 3 caracteres')
    .max(30, 'Nome de usuário deve ter no máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Nome de usuário pode conter apenas letras, números e _ . -'),
  email: z.string().email('E-mail informado é inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
})

export const LoginInputSchema = z.object({
  email: z.string().email('E-mail informado é inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const UserSummarySchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
})

export const AuthResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: UserSummarySchema,
})

export const SessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: UserSummarySchema.nullable(),
})

export type RegisterInput = z.infer<typeof RegisterInputSchema>
export type LoginInput = z.infer<typeof LoginInputSchema>
export type UserSummary = z.infer<typeof UserSummarySchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type SessionResponse = z.infer<typeof SessionResponseSchema>
