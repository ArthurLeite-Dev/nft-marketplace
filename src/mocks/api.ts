import type { DbNft, Network } from './db/types'
import type { ScenarioId } from './scenarios'
import { dbUpdate, getScenarioMark, getVersion, mockNow } from './db/store'
import { addEth } from '../lib/eth'
import { bumpCounter } from './control'
import { getSessionFromToken, loginUser, logoutUser, registerUser } from './domain/session'
import { getCatalogPage, getFacets, getHighlights, getNftById, getRelatedNfts } from './domain/catalog'
import { acceptPrice, addItem, applyCoupon, buildCartView, changeQuantity, findCart, mergeGuestCart, removeCoupon, removeLine, type CartOwner } from './domain/cart'
import { connectWallet, createQuote, disconnectWallet, getOrder, listOrders, orderView, placeOrder, settleDueOrders } from './domain/checkout'
import { applyNftUpdate } from './domain/nft-updates'
import { changePassword, getUser, publicUser, setAvatar, updateProfile, upsertWallet } from './domain/account'
import type { DomainError } from './domain/errors'

/**
 * Servidor REST simulado, em função pura: recebe uma requisição descrita como dado e devolve
 * { status, body }. O MSW é só um adaptador (handlers/index.ts). Isso permite testar contratos e
 * regras de negócio sem navegador e garante que catálogo, favoritos, carrinho, perfil, carteiras e
 * pedidos compartilham o MESMO estado.
 */
export interface ApiRequest {
  method: string
  /** Caminho já sem o prefixo /api/v1. */
  path: string
  query: URLSearchParams
  /** Cabeçalhos com nomes em minúsculas. */
  headers: Record<string, string>
  body: unknown
  scenario: ScenarioId
}

export interface ApiResult {
  status: number
  body?: unknown
  /** O servidor processou a requisição, mas a resposta se perde (cenário order-timeout). */
  lostResponse?: boolean
}

const ok = (body: unknown, status = 200): ApiResult => ({ status, body })

const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 422, COUPON_INVALID: 422, COUPON_EXPIRED: 422, INVALID_CURRENT_PASSWORD: 422,
  UNAUTHENTICATED: 401, SESSION_EXPIRED: 401, INVALID_CREDENTIALS: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  CONFLICT: 409, AVAILABILITY_CONFLICT: 409, IDEMPOTENCY_KEY_REUSED: 409, QUOTE_CHANGED: 409, ADDRESS_IN_USE: 409,
  EMAIL_TAKEN: 409, USERNAME_TAKEN: 409, WALLET_REJECTED: 409, WALLET_DISCONNECTED: 409, QUOTE_EXPIRED: 410,
  SERVER_ERROR: 503,
}

export function httpStatusForCode(code: string): number {
  return STATUS_BY_CODE[code] ?? 500
}

export function fail(status: number, code: string, message: string, fields?: Record<string, string>, details?: Record<string, unknown>): ApiResult {
  return { status, body: { error: { code, message, ...(fields ? { fields } : {}), ...(details ? { details } : {}), retryable: status >= 500 } } }
}

function failDomain(error: DomainError): ApiResult {
  return fail(error.status, error.code, error.message, error.fields, error.details)
}

interface Ctx {
  req: ApiRequest
  params: string[]
  userId: string | null
  owner: CartOwner
  body: Record<string, unknown>
}

type Auth = 'none' | 'optional' | 'required'
interface Route {
  method: string
  pattern: RegExp
  auth: Auth
  run: (ctx: Ctx) => ApiResult
}

function serializeNft(nft: DbNft) {
  return { ...nft, version: getVersion(`nft:${nft.id}`) }
}

function favoritesView(userId: string) {
  const user = getUser(userId)!
  const items = user.favorites.map((id) => getNftById(id)).filter((n): n is DbNft => Boolean(n)).map(serializeNft)
  return { items, nftIds: user.favorites, updatedAt: mockNow().toISOString() }
}

const SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
const TABS = ['all', 'new', 'trending'] as const

const routes: Route[] = [
  // ---------- Sessão e conta ----------
  {
    method: 'POST', pattern: /^\/auth\/register$/, auth: 'none',
    run: ({ body }) => {
      const result = registerUser({ username: String(body.username ?? ''), email: String(body.email ?? ''), password: String(body.password ?? '') })
      if (!result.ok) return fail(httpStatusForCode(result.code), result.code, result.message, result.fields)
      const login = loginUser({ email: String(body.email ?? ''), password: String(body.password ?? '') })
      if (!login.ok) return fail(500, 'SERVER_ERROR', 'Falha ao iniciar a sessão')
      return ok({ token: login.token, expiresAt: login.expiresAt, user: login.user }, 201)
    },
  },
  {
    method: 'POST', pattern: /^\/auth\/login$/, auth: 'none',
    run: ({ body }) => {
      const result = loginUser({ email: String(body.email ?? ''), password: String(body.password ?? '') })
      if (!result.ok) return fail(httpStatusForCode(result.code), result.code, result.message, result.fields)
      return ok({ token: result.token, expiresAt: result.expiresAt, user: result.user })
    },
  },
  {
    method: 'POST', pattern: /^\/auth\/logout$/, auth: 'none',
    run: ({ req }) => {
      const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')?.[1] ?? null
      logoutUser(token)
      return ok({ ok: true })
    },
  },
  {
    method: 'GET', pattern: /^\/auth\/session$/, auth: 'optional',
    run: ({ userId }) => {
      if (!userId) return ok({ authenticated: false, user: null })
      const u = getUser(userId)!
      return ok({ authenticated: true, user: { id: u.id, username: u.username, email: u.email, avatarUrl: u.avatarUrl ?? null } })
    },
  },

  // ---------- NFTs ----------
  {
    method: 'GET', pattern: /^\/nfts$/, auth: 'none',
    run: ({ req }) => {
      const q = req.query
      const facets = getFacets()
      if (req.scenario === 'empty') {
        return ok({ items: [], pagination: { page: 1, pageSize: 9, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, facets })
      }
      const sort = q.get('sort')
      const tab = q.get('tab')
      const page = Number(q.get('page'))
      const result = getCatalogPage({
        q: q.get('q') || undefined,
        collections: (q.get('collections') || '').split(',').filter(Boolean),
        networks: (q.get('networks') || '').split(',').filter(Boolean),
        minPrice: q.get('minPrice') || undefined,
        maxPrice: q.get('maxPrice') || undefined,
        tab: (TABS as readonly string[]).includes(tab ?? '') ? (tab as (typeof TABS)[number]) : 'all',
        sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as (typeof SORTS)[number]) : 'recent',
        page: Number.isInteger(page) && page > 0 ? page : 1,
        pageSize: 9,
      })
      return ok({ items: result.items.map(serializeNft), pagination: result.pagination, facets })
    },
  },
  { method: 'GET', pattern: /^\/nfts\/highlights$/, auth: 'none', run: ({ req }) => ok({ items: req.scenario === 'empty' ? [] : getHighlights().map(serializeNft) }) },
  {
    method: 'GET', pattern: /^\/nfts\/([^/]+)\/related$/, auth: 'none',
    run: ({ req, params }) => ok({ items: req.scenario === 'empty' ? [] : getRelatedNfts(params[0]!).map(serializeNft) }),
  },
  {
    method: 'GET', pattern: /^\/nfts\/([^/]+)$/, auth: 'none',
    run: ({ params }) => {
      const nft = getNftById(params[0]!)
      return nft ? ok(serializeNft(nft)) : fail(404, 'NOT_FOUND', 'NFT não encontrado', undefined, { nftId: params[0]! })
    },
  },

  // ---------- Favoritos ----------
  { method: 'GET', pattern: /^\/me\/favorites$/, auth: 'required', run: ({ userId }) => ok(favoritesView(userId!)) },
  {
    method: 'PUT', pattern: /^\/me\/favorites\/([^/]+)$/, auth: 'required',
    run: ({ userId, params }) => {
      if (!getNftById(params[0]!)) return fail(404, 'NOT_FOUND', 'NFT não encontrado', undefined, { nftId: params[0]! })
      dbUpdate((d) => {
        const u = d.users.find((x) => x.id === userId)!
        if (!u.favorites.includes(params[0]!)) u.favorites.push(params[0]!)
      })
      return ok({ ok: true, nftId: params[0]!, favorited: true })
    },
  },
  {
    method: 'DELETE', pattern: /^\/me\/favorites\/([^/]+)$/, auth: 'required',
    run: ({ userId, params }) => {
      dbUpdate((d) => {
        const u = d.users.find((x) => x.id === userId)!
        u.favorites = u.favorites.filter((id) => id !== params[0]!)
      })
      return ok({ ok: true, nftId: params[0]!, favorited: false })
    },
  },

  // ---------- Carrinho ----------
  { method: 'GET', pattern: /^\/cart$/, auth: 'optional', run: ({ owner }) => ok(buildCartView(findCart(owner))) },
  {
    method: 'POST', pattern: /^\/cart\/items$/, auth: 'optional',
    run: ({ owner, body }) => {
      const r = addItem(owner, { nftId: String(body.nftId ?? ''), editionId: String(body.editionId ?? ''), quantity: body.quantity === undefined ? 1 : Number(body.quantity) })
      return r.ok ? ok(buildCartView(r.cart)) : failDomain(r.error)
    },
  },
  {
    method: 'PATCH', pattern: /^\/cart\/items\/([^/]+)$/, auth: 'optional',
    run: ({ owner, params, body }) => {
      if (body.acceptPrice === undefined && body.quantity === undefined) return fail(422, 'VALIDATION_ERROR', 'Informe quantity ou acceptPrice')
      let cart = findCart(owner)
      if (body.acceptPrice === true) {
        const r = acceptPrice(owner, params[0]!)
        if (!r.ok) return failDomain(r.error)
        cart = r.cart
      }
      if (body.quantity !== undefined) {
        const r = changeQuantity(owner, params[0]!, Number(body.quantity))
        if (!r.ok) return failDomain(r.error)
        cart = r.cart
      }
      return ok(buildCartView(cart))
    },
  },
  {
    method: 'DELETE', pattern: /^\/cart\/items\/([^/]+)$/, auth: 'optional',
    run: ({ owner, params }) => {
      const r = removeLine(owner, params[0]!)
      return r.ok ? ok(buildCartView(r.cart)) : failDomain(r.error)
    },
  },
  {
    method: 'PUT', pattern: /^\/cart\/coupon$/, auth: 'optional',
    run: ({ req, owner, body }) => {
      const r = applyCoupon(owner, String(body.code ?? ''), { forceExpired: req.scenario === 'coupon-expired' })
      return r.ok ? ok(buildCartView(r.cart)) : failDomain(r.error)
    },
  },
  {
    method: 'DELETE', pattern: /^\/cart\/coupon$/, auth: 'optional',
    run: ({ owner }) => {
      const r = removeCoupon(owner)
      return r.ok ? ok(buildCartView(r.cart)) : failDomain(r.error)
    },
  },
  {
    method: 'POST', pattern: /^\/cart\/merge$/, auth: 'required',
    run: ({ req, userId }) => {
      const merged = mergeGuestCart(req.headers['x-cart-id'] ?? null, userId!)
      return ok({ cart: buildCartView(merged.cart), adjustments: merged.adjustments })
    },
  },

  // ---------- Cotação, carteira e pedidos ----------
  {
    method: 'POST', pattern: /^\/checkout\/quote$/, auth: 'required',
    run: ({ req, userId, body }) => {
      if (req.scenario === 'price-changed' || req.scenario === 'sold-out') {
        // Cenário determinístico: na 2ª cotação o 1º item do carrinho muda "durante a navegação".
        if (bumpCounter(`${req.scenario}:quote`) === 2) {
          const first = findCart({ userId, guestCartId: null })?.lines[0]
          const edition = first ? getNftById(first.nftId)?.editions.find((e) => e.id === first.editionId) : undefined
          if (first && edition) {
            applyNftUpdate(first.nftId, {
              editions: { [first.editionId]: req.scenario === 'price-changed' ? { priceEth: addEth(edition.priceEth, '0.1') } : { available: 0 } },
            })
          }
        }
      }
      const r = createQuote(userId!, String(body.network ?? 'Ethereum') as Network)
      return r.ok ? ok(r.quote, 201) : failDomain(r.error)
    },
  },
  {
    method: 'POST', pattern: /^\/wallet-connections$/, auth: 'required',
    run: ({ req, userId, body }) => {
      if (req.scenario === 'wallet-rejected' && bumpCounter('wallet-rejected:connect') === 1) {
        return fail(409, 'WALLET_REJECTED', 'A carteira recusou a conexão', { provider: 'Conexão recusada pela carteira' })
      }
      const r = connectWallet(userId!, body)
      if (!r.ok) return failDomain(r.error)
      const c = r.connection
      return ok({ connectionId: c.id, address: c.address, provider: c.provider, network: c.network, connectedAt: c.connectedAt, expiresAt: c.expiresAt }, 201)
    },
  },
  {
    method: 'DELETE', pattern: /^\/wallet-connections\/([^/]+)$/, auth: 'required',
    run: ({ userId, params }) => {
      const r = disconnectWallet(userId!, params[0]!)
      return r.ok ? ok({ ok: true }) : failDomain(r.error)
    },
  },
  {
    method: 'POST', pattern: /^\/orders$/, auth: 'required',
    run: ({ req, userId, body }) => {
      const outcome = req.scenario === 'payment-refused' ? 'refused' : 'confirmed'
      const r = placeOrder(userId!, req.headers['idempotency-key'] ?? null, body, { outcome })
      if (!r.ok) return failDomain(r.error)
      const result = ok({ order: orderView(r.order), created: r.created }, r.created ? 201 : 200)
      if (req.scenario === 'order-timeout' && r.created && bumpCounter('order-timeout:create') === 1) result.lostResponse = true
      return result
    },
  },
  {
    method: 'GET', pattern: /^\/orders\/([^/]+)$/, auth: 'required',
    run: ({ userId, params }) => {
      const r = getOrder(userId!, params[0]!)
      return r.ok ? ok(orderView(r.order)) : failDomain(r.error)
    },
  },
  {
    method: 'GET', pattern: /^\/me\/orders$/, auth: 'required',
    run: ({ req, userId }) => ok({ orders: listOrders(userId!, req.query.get('status')).map(orderView) }),
  },

  // ---------- Perfil e carteiras ----------
  {
    method: 'GET', pattern: /^\/me\/profile$/, auth: 'required',
    run: ({ userId }) => ok({ ok: true, user: publicUser(getUser(userId!)!) }),
  },
  {
    method: 'PATCH', pattern: /^\/me\/profile$/, auth: 'required',
    run: ({ userId, body }) => {
      const r = updateProfile(userId!, body as { username?: string; email?: string; ensName?: string | null })
      return r.ok ? ok({ ok: true, user: publicUser(r.user) }) : fail(r.error.status, r.error.code, r.error.message, r.error.fields)
    },
  },
  {
    method: 'PUT', pattern: /^\/me\/avatar$/, auth: 'required',
    run: ({ userId, body }) => {
      const r = setAvatar(userId!, typeof body.avatarUrl === 'string' ? body.avatarUrl : null)
      return r.ok ? ok({ ok: true, avatarUrl: getUser(userId!)?.avatarUrl ?? null }) : fail(r.error.status, r.error.code, r.error.message, r.error.fields)
    },
  },
  {
    method: 'DELETE', pattern: /^\/me\/avatar$/, auth: 'required',
    run: ({ userId }) => {
      setAvatar(userId!, null)
      return ok({ ok: true, avatarUrl: null })
    },
  },
  {
    method: 'POST', pattern: /^\/me\/password$/, auth: 'required',
    run: ({ userId, body }) => {
      const r = changePassword(userId!, {
        currentPassword: String(body.currentPassword ?? ''),
        newPassword: String(body.newPassword ?? ''),
        confirmPassword: String(body.confirmPassword ?? ''),
      })
      return r.ok ? ok({ ok: true }) : fail(r.error.status, r.error.code, r.error.message, r.error.fields)
    },
  },
  { method: 'GET', pattern: /^\/me\/wallets$/, auth: 'required', run: ({ userId }) => ok({ ok: true, wallets: getUser(userId!)!.wallets }) },
  {
    method: 'PUT', pattern: /^\/me\/wallets\/(principal|secundaria)$/, auth: 'required',
    run: ({ userId, params, body }) => {
      const r = upsertWallet(userId!, { slot: params[0] as 'principal' | 'secundaria', ...(body as object) } as Parameters<typeof upsertWallet>[1])
      return r.ok ? ok({ ok: true, wallet: r.wallet }) : fail(r.error.status, r.error.code, r.error.message, r.error.fields)
    },
  },
]

function authenticate(req: ApiRequest): { userId: string | null } | { error: ApiResult } {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')
  if (!match) return { userId: null }
  const found = getSessionFromToken(match[1]!)
  if (!found) return { error: fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Faça login novamente.') }
  if (req.scenario === 'session-expired') {
    const activatedAt = getScenarioMark('session-expired')
    if (activatedAt && found.session.issuedAt < activatedAt) {
      return { error: fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Faça login novamente.') }
    }
  }
  return { userId: found.session.userId }
}

export function handleApi(req: ApiRequest): ApiResult {
  // Liquidação preguiçosa: qualquer leitura vê o estado correto, mesmo após refresh.
  settleDueOrders()

  const route = routes.find((r) => r.method === req.method && r.pattern.test(req.path))
  if (!route) return fail(404, 'NOT_FOUND', 'Rota não encontrada')

  const auth = authenticate(req)
  if ('error' in auth) return auth.error
  if (route.auth === 'required') {
    if (!auth.userId) return fail(401, 'UNAUTHENTICATED', 'Faça login para continuar')
    if (req.scenario === 'forbidden') return fail(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso')
  }

  const params = route.pattern.exec(req.path)?.slice(1).map(decodeURIComponent) ?? []
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const owner: CartOwner = { userId: auth.userId, guestCartId: auth.userId ? null : (req.headers['x-cart-id'] ?? null) }
  try {
    return route.run({ req, params, userId: auth.userId, owner, body })
  } catch (error) {
    console.error('[mocks] erro inesperado no handler', req.method, req.path, error)
    return fail(500, 'SERVER_ERROR', 'Erro interno do servidor simulado')
  }
}
