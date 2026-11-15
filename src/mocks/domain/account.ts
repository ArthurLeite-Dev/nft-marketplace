import type { DbUser, Network } from '../db/types'
import { dbUpdate, getDbRaw } from '../db/store'
import { hashPassword, verifyPassword } from './session'

export interface ProfileUpdate {
  displayName?: string
  username?: string
  email?: string
  ensName?: string | null
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface WalletUpsert {
  slot: 'principal' | 'secundaria'
  nickname: string
  displayName: string
  profileName: string
  network: Network
  address: string
  walletType: string
  referralCode: string | null
  email: string | null
  ensName: string | null
}

export function getUser(userId: string): DbUser | undefined {
  return getDbRaw().users.find((u) => u.id === userId)
}

export function updateProfile(userId: string, input: ProfileUpdate): { ok: true; user: DbUser } | { ok: false; error: { code: string; message: string; fields: Record<string, string>; status: number } } {
  const fields: Record<string, string> = {}
  const db = getDbRaw()
  const user = db.users.find((u) => u.id === userId)
  if (!user) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado', fields: {}, status: 404 } }
  }

  if (input.username !== undefined) {
    if (!input.username || input.username.length < 3 || input.username.length > 30 || !/^[a-zA-Z0-9_.-]+$/.test(input.username)) {
      fields.username = 'Usuário inválido'
    } else if (db.users.some((u) => u.id !== userId && u.username === input.username)) {
      fields.username = 'Nome de usuário já em uso'
    }
  }
  if (input.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      fields.email = 'E-mail inválido'
    } else if (db.users.some((u) => u.id !== userId && u.email === input.email)) {
      fields.email = 'E-mail já cadastrado'
    }
  }
  if (Object.keys(fields).length) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Erro de validação', fields, status: 422 } }
  }

  dbUpdate((d) => {
    const u = d.users.find((x) => x.id === userId)!
    if (input.username !== undefined) u.username = input.username
    if (input.email !== undefined) u.email = input.email
    if (input.ensName !== undefined) {
      if (u.wallets.principal) u.wallets.principal.ensName = input.ensName
      if (u.wallets.secundaria) u.wallets.secundaria.ensName = input.ensName
    }
    return undefined
  })

  return { ok: true, user: getDbRaw().users.find((u) => u.id === userId)! }
}

export function changePassword(userId: string, input: PasswordChange): { ok: true } | { ok: false; error: { code: string; message: string; fields: Record<string, string>; status: number } } {
  const fields: Record<string, string> = {}
  const db = getDbRaw()
  const user = db.users.find((u) => u.id === userId)
  if (!user) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado', fields: {}, status: 404 } }
  }

  if (!input.currentPassword) fields.currentPassword = 'Senha atual é obrigatória'
  if (!input.newPassword || input.newPassword.length < 8 || !/[a-zA-Z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
    fields.newPassword = 'Nova senha deve ter pelo menos 8 caracteres, uma letra e um número'
  }
  if (input.newPassword !== input.confirmPassword) fields.confirmPassword = 'As senhas não coincidem'
  if (Object.keys(fields).length) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Erro de validação', fields, status: 422 } }
  }

  if (!verifyPassword(input.currentPassword, user.salt, user.passwordHash)) {
    return { ok: false, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Senha atual incorreta', fields: { currentPassword: 'Senha atual incorreta' }, status: 422 } }
  }

  dbUpdate((d) => {
    const u = d.users.find((x) => x.id === userId)!
    u.passwordHash = hashPassword(input.newPassword, u.salt)
    return undefined
  })

  return { ok: true }
}

export function upsertWallet(userId: string, input: WalletUpsert): { ok: true; wallet: import('../db/types').DbWallet } | { ok: false; error: { code: string; message: string; fields: Record<string, string>; status: number } } {
  const fields: Record<string, string> = {}
  const db = getDbRaw()
  const user = db.users.find((u) => u.id === userId)
  if (!user) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado', fields: {}, status: 404 } }
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(input.address)) {
    fields.address = 'Endereço EVM inválido'
  }
  const otherSlot = input.slot === 'principal' ? 'secundaria' : 'principal'
  const other = user.wallets[otherSlot]
  if (other && other.address.toLowerCase() === input.address.toLowerCase()) {
    fields.address = 'Este endereço já está cadastrado no outro slot'
  }
  if (Object.keys(fields).length) {
    return { ok: false, error: { code: 'ADDRESS_IN_USE', message: 'Endereço já em uso', fields, status: 409 } }
  }

  const wallet: import('../db/types').DbWallet = {
    slot: input.slot,
    nickname: input.nickname,
    displayName: input.displayName,
    profileName: input.profileName,
    network: input.network,
    address: input.address,
    walletType: input.walletType,
    referralCode: input.referralCode,
    email: input.email,
    ensName: input.ensName,
  }

  dbUpdate((d) => {
    const u = d.users.find((x) => x.id === userId)!
    u.wallets[input.slot] = wallet
    return undefined
  })

  return { ok: true, wallet }
}
