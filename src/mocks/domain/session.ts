import type { DbSchema, DbSession, DbUser } from '../db/types'
import { getDbRaw, dbUpdate, generateId, mockNow, stableHash } from '../db/store'

const TOKEN_PREFIX = 'jungle_'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 min

export function generateToken(): string {
  return `${TOKEN_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`
}

export function hashPassword(password: string, salt: string): string {
  return stableHash(salt + password)
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  return hashPassword(password, salt) === hash
}

export interface AuthUser {
  id: string
  username: string
  email: string
}

export function findUserByCredentials(db: DbSchema, email: string, password: string): { user: DbUser; authUser: AuthUser } | null {
  const user = db.users.find((u) => u.email === email)
  if (!user) return null
  if (!verifyPassword(password, user.salt, user.passwordHash)) return null
  const authUser: AuthUser = { id: user.id, username: user.username, email: user.email }
  return { user, authUser }
}

export function createSession(userId: string): DbSession {
  const token = generateToken()
  const now = mockNow()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  return { token, userId, expiresAt }
}

export function isSessionValid(session: DbSession | null): boolean {
  if (!session) return false
  return mockNow() < new Date(session.expiresAt)
}

export function getSessionFromToken(token: string | null): { session: DbSession; user: DbUser } | null {
  if (!token) return null
  const db = getDbRaw()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return null
  if (!isSessionValid(session)) return null
  const user = db.users.find((u) => u.id === session.userId)
  if (!user) return null
  return { session, user }
}

export function invalidateUserSessions(userId: string): void {
  dbUpdate((db) => {
    db.sessions = db.sessions.filter((s) => s.userId !== userId)
    return undefined
  })
}

export function clearExpiredSessions(): void {
  dbUpdate((db) => {
    db.sessions = db.sessions.filter((s) => isSessionValid(s))
    return undefined
  })
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export function validateRegisterInput(input: RegisterInput): { ok: true } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  if (!input.username || input.username.length < 3 || input.username.length > 30 || !/^[a-zA-Z0-9_.-]+$/.test(input.username)) {
    fields.username = 'Usuário deve ter 3–30 caracteres (letras, números, _, - e .)'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    fields.email = 'E-mail inválido'
  }
  if (!input.password || input.password.length < 8 || !/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) {
    fields.password = 'Senha deve ter pelo menos 8 caracteres, uma letra e um número'
  }
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true }
}

export function registerUser(input: RegisterInput): { ok: true; user: AuthUser } | { ok: false; code: string; message: string; fields: Record<string, string> } {
  const validation = validateRegisterInput(input)
  if (!validation.ok) return { ok: false, code: 'VALIDATION_ERROR', message: 'Erro de validação', fields: validation.fields }

  const db = getDbRaw()
  if (db.users.some((u) => u.email === input.email)) {
    return { ok: false, code: 'EMAIL_TAKEN', message: 'Este e-mail já está cadastrado', fields: { email: 'E-mail já cadastrado' } }
  }
  if (db.users.some((u) => u.username === input.username)) {
    return { ok: false, code: 'USERNAME_TAKEN', message: 'Este nome de usuário já está em uso', fields: { username: 'Nome de usuário já em uso' } }
  }

  const salt = `jungle-${generateId('salt')}`
  const passwordHash = hashPassword(input.password, salt)
  const userId = generateId('usr')
  const now = mockNow().toISOString()

  dbUpdate((d) => {
    d.users.push({
      id: userId,
      username: input.username,
      email: input.email,
      passwordHash,
      salt,
      wallets: { principal: null, secundaria: null },
      favorites: [],
      createdAt: now,
    })
    return undefined
  })

  return { ok: true, user: { id: userId, username: input.username, email: input.email } }
}

export interface LoginInput {
  email: string
  password: string
}

export function loginUser(input: LoginInput): { ok: true; token: string; expiresAt: string; user: AuthUser } | { ok: false; code: string; message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    fields.email = 'E-mail inválido'
  }
  if (!input.password) {
    fields.password = 'Senha é obrigatória'
  }
  if (Object.keys(fields).length) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Erro de validação', fields }
  }

  const found = findUserByCredentials(getDbRaw(), input.email, input.password)
  if (!found) {
    return { ok: false, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos', fields: { email: 'Credenciais inválidas', password: 'Credenciais inválidas' } }
  }

  clearExpiredSessions()
  invalidateUserSessions(found.user.id)

  const session = createSession(found.user.id)
  dbUpdate((d) => {
    d.sessions.push(session)
    return undefined
  })

  return { ok: true, token: session.token, expiresAt: session.expiresAt, user: found.authUser }
}

export function logoutUser(token: string | null): { ok: true } {
  if (token) {
    dbUpdate((d) => {
      d.sessions = d.sessions.filter((s) => s.token !== token)
      return undefined
    })
  }
  return { ok: true }
}
