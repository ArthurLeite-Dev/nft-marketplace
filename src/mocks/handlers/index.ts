import { http, HttpResponse } from 'msw'
import type { RequestHandler } from 'msw'
import { withScenarioHandler, requireAuth, checkSession, errorResponse, httpStatusForCode, cartIdFromHeaders, idempotencyKeyFromHeaders } from './base'
import { registerUser, loginUser, logoutUser, getSessionFromToken } from '../domain/session'
import { getCatalogPage, getNftById, getRelatedNfts, getHighlights, getFacets } from '../domain/catalog'
import {
  buildCartView,
  addOrUpdateItem,
  changeQuantity,
  removeLine,
  applyCoupon,
  removeCoupon,
  mergeGuestCart,
  getOrCreateCart,
} from '../domain/cart'
import { createQuote, placeOrder, getOrder, settleOrder } from '../domain/checkout'
import { updateProfile, changePassword, upsertWallet, getUser } from '../domain/account'
import { getDbRaw } from '../db/store'
import { getActiveScenario } from '../control'

const REST_HANDLERS: RequestHandler[] = [
  // --- Auth ---
  http.post('/api/v1/auth/register', async ({ request }) => {
    return withScenarioHandler(async () => {
      const body = (await request.json()) as { username?: string; email?: string; password?: string }
      const result = registerUser({ username: body.username ?? '', email: body.email ?? '', password: body.password ?? '' })
      if (!result.ok) {
        return errorResponse(httpStatusForCode(result.code), result.code, result.message, result.fields, undefined, false)
      }
      return HttpResponse.json({ ok: true, user: result.user }, { status: 201 })
    }, request)
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    return withScenarioHandler(async () => {
      const body = (await request.json()) as { email?: string; password?: string }
      const result = loginUser({ email: body.email ?? '', password: body.password ?? '' })
      if (!result.ok) {
        return errorResponse(httpStatusForCode(result.code), result.code, result.message, result.fields, undefined, false)
      }
      return HttpResponse.json({ ok: true, token: result.token, expiresAt: result.expiresAt, user: result.user })
    }, request)
  }),

  http.post('/api/v1/auth/logout', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (match) logoutUser(match[1] ?? null)
      return HttpResponse.json({ ok: true })
    }, request)
  }),

  http.get('/api/v1/auth/session', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) {
        return HttpResponse.json({ authenticated: false, user: null })
      }
      const result = getSessionFromToken(match[1]!)
      if (!result) {
        return HttpResponse.json({ authenticated: false, user: null })
      }
      return HttpResponse.json({
        authenticated: true,
        user: { id: result.user.id, username: result.user.username, email: result.user.email },
      })
    }, request)
  }),

  // --- NFTs / catalog ---
  http.get('/api/v1/nfts', async ({ request }) => {
    return withScenarioHandler(async () => {
      const url = new URL(request.url)
      const q = url.searchParams.get('q') || undefined
      const collections = (url.searchParams.get('collections') || '').split(',').filter(Boolean)
      const networks = (url.searchParams.get('networks') || '').split(',').filter(Boolean)
      const minPrice = url.searchParams.get('minPrice') || undefined
      const maxPrice = url.searchParams.get('maxPrice') || undefined
      const tab = (url.searchParams.get('tab') as any) || 'all'
      const sort = (url.searchParams.get('sort') as any) || 'recent'
      const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined
      const pageSize = 9

      const pageResult = getCatalogPage({ q, collections, networks, minPrice, maxPrice, tab, sort, page, pageSize })
      const facets = getFacets()
      return HttpResponse.json({ items: pageResult.items, pagination: pageResult.pagination, facets })
    }, request)
  }),

  http.get('/api/v1/nfts/highlights', async ({ request }) => {
    return withScenarioHandler(async () => {
      return HttpResponse.json({ items: getHighlights() })
    }, request)
  }),

  http.get('/api/v1/nfts/:nftId', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const nft = getNftById(String(params.nftId ?? ''))
      if (!nft) {
        return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado', {}, { nftId: String(params.nftId ?? '') })
      }
      return HttpResponse.json(nft)
    }, request)
  }),

  http.get('/api/v1/nfts/:nftId/related', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      return HttpResponse.json({ items: getRelatedNfts(String(params.nftId ?? '')) })
    }, request)
  }),

  // --- Favorites ---
  http.get('/api/v1/me/favorites', async ({ request }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const user = getUser(session.userId)
      if (!user) return errorResponse(404, 'NOT_FOUND', 'Usuário não encontrado', {}, {}, false)
      const items = user.favorites.map((id) => getNftById(id)).filter(Boolean)
      return HttpResponse.json({ items })
    }, request)
  }),

  http.put('/api/v1/me/favorites/:nftId', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const nftId = String(params.nftId ?? '')
      const nftExists = getDbRaw().nfts.find((n) => n.id === nftId)
      if (!nftExists) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado', {}, { nftId })
      const { dbUpdate } = await import('../db/store')
      dbUpdate((db) => {
        const user = db.users.find((u) => u.id === session.userId)!
        if (user.favorites.includes(nftId)) {
          user.favorites = user.favorites.filter((id) => id !== nftId)
        } else {
          user.favorites.push(nftId)
        }
        return undefined
      })
      const nowFavorited = getDbRaw().users.find((u) => u.id === session.userId)!.favorites.includes(nftId)
      return HttpResponse.json({ ok: true, favorited: nowFavorited })
    }, request)
  }),

  http.delete('/api/v1/me/favorites/:nftId', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const { dbUpdate } = await import('../db/store')
      dbUpdate((db) => {
        const user = db.users.find((u) => u.id === session.userId)!
        user.favorites = user.favorites.filter((id) => id !== String(params.nftId ?? ''))
        return undefined
      })
      return HttpResponse.json({ ok: true })
    }, request)
  }),

  // --- Cart ---
  http.get('/api/v1/cart', async ({ request }) => {
    return withScenarioHandler(async () => {
      const guestCartId = cartIdFromHeaders(request.headers)
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      let cart
      if (match) {
      const result = getSessionFromToken(match[1]!)
        if (!result) return errorResponse(401, 'SESSION_EXPIRED', 'Sessão expirada', {}, {}, false)
        cart = getOrCreateCart({ userId: result.session.userId, guestCartId: null, network: null })
        if (guestCartId) {
          const merged = mergeGuestCart(guestCartId, result.session.userId)
          if (merged.ok) cart = merged.cart
        }
      } else {
        cart = getOrCreateCart({ userId: null, guestCartId, network: null })
      }
      // Fallback defensivo: se o carrinho não pôde ser criado/recuperado, usa um vazio
      if (!cart) {
        cart = {
          id: 'cart_empty',
          userId: null,
          guestCartId: guestCartId ?? null,
          version: 1,
          lines: [],
          couponCode: null,
          couponDiscountBp: 0,
          network: null,
          totals: { subtotalEth: '0', discountEth: '0', networkFeeEth: '0', totalEth: '0' },
          updatedAt: new Date().toISOString(),
        } as any
      }
      const view = buildCartView(cart, getDbRaw().nfts)
      return HttpResponse.json(view)
    }, request)
  }),

  http.post('/api/v1/cart/items', async ({ request }) => {
    return withScenarioHandler(async () => {
      const guestCartId = cartIdFromHeaders(request.headers)
      const body = (await request.json()) as { nftId?: string; editionId?: string; quantity?: number }
      const result = addOrUpdateItem({ nftId: body.nftId ?? '', editionId: body.editionId ?? '', quantity: body.quantity ?? 1, guestCartId })
      if (!result.ok) {
        return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, result.error.details, false)
      }
      return HttpResponse.json(buildCartView(result.cart, getDbRaw().nfts))
    }, request)
  }),

  http.patch('/api/v1/cart/items/:lineId', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const guestCartId = cartIdFromHeaders(request.headers)
      const body = (await request.json()) as { quantity?: number; acceptPrice?: boolean }
      if (body.quantity !== undefined) {
        const result = changeQuantity({ lineId: String(params.lineId), quantity: body.quantity }, guestCartId)
        if (!result.ok) {
          return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, result.error.details, false)
        }
        return HttpResponse.json(buildCartView(result.cart, getDbRaw().nfts))
      }
      return errorResponse(422, 'VALIDATION_ERROR', 'Campo obrigatório ausente', {}, {}, false)
    }, request)
  }),

  http.delete('/api/v1/cart/items/:lineId', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const guestCartId = cartIdFromHeaders(request.headers)
      const result = removeLine(String(params.lineId), guestCartId)
      if (!result.ok) {
        return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, result.error.details, false)
      }
      return HttpResponse.json(buildCartView(result.cart, getDbRaw().nfts))
    }, request)
  }),

  http.put('/api/v1/cart/coupon', async ({ request }) => {
    return withScenarioHandler(async () => {
      const guestCartId = cartIdFromHeaders(request.headers)
      const body = (await request.json()) as { code?: string }
      const result = applyCoupon(body.code ?? '', guestCartId)
      if (!result.ok) {
        return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, undefined, false)
      }
      return HttpResponse.json(buildCartView(result.cart, getDbRaw().nfts))
    }, request)
  }),

  http.delete('/api/v1/cart/coupon', async ({ request }) => {
    return withScenarioHandler(async () => {
      const guestCartId = cartIdFromHeaders(request.headers)
      const result = removeCoupon(guestCartId)
      return HttpResponse.json(buildCartView(result.cart, getDbRaw().nfts))
    }, request)
  }),

  http.post('/api/v1/cart/merge', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) return errorResponse(401, 'UNAUTHENTICATED', 'Token não fornecido', {}, {}, false)
      const session = checkSession(match[1]!)
      if (!session.ok) return session.response
      const guestCartId = cartIdFromHeaders(request.headers)
      const merged = mergeGuestCart(guestCartId, session.userId)
      if (!merged.ok) return errorResponse(merged.error.status, merged.error.code, merged.error.message, merged.error.fields, merged.error.details, false)
      return HttpResponse.json({ cart: buildCartView(merged.cart, getDbRaw().nfts), adjustments: merged.adjustments })
    }, request)
  }),

  // --- Checkout / quote / wallet ---
  http.post('/api/v1/checkout/quote', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      const body = (await request.json()) as { guestCartId?: string; network?: string }
      const guestCartId: string | null = body.guestCartId ?? cartIdFromHeaders(request.headers) ?? null
      const network = (body.network ?? 'Ethereum') as any
      const userId = match ? match[1]! : null
      const result = createQuote({ guestCartId, userId, network })
      if (!result.ok) {
        return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, result.error.details, false)
      }
      return HttpResponse.json(result.quote)
    }, request)
  }),

  http.post('/api/v1/wallet-connections', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) return errorResponse(401, 'UNAUTHENTICATED', 'Token não fornecido', {}, {}, false)
      const session = checkSession(match[1]!)
      if (!session.ok) return session.response
      const body = (await request.json()) as { provider?: string; walletAddress?: string; network?: string }
      if (getActiveScenario() === 'wallet-rejected') {
        const db = getDbRaw()
        const alreadyConnected = db.orders.length > 0
        if (!alreadyConnected) {
          return errorResponse(409, 'WALLET_REJECTED', 'Carteira recusada pela simulação', { provider: 'Conexão recusada' }, {}, false)
        }
      }
      return HttpResponse.json({ ok: true, provider: body.provider ?? 'MetaMask', walletAddress: body.walletAddress ?? '', connectedAt: new Date().toISOString() })
    }, request)
  }),

  // --- Orders ---
  http.post('/api/v1/orders', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) return errorResponse(401, 'UNAUTHENTICATED', 'Token não fornecido', {}, {}, false)
      const session = checkSession(match[1]!)
      if (!session.ok) return session.response

      const idempotencyKey = idempotencyKeyFromHeaders(request.headers)
      const body = (await request.json()) as {
        guestCartId?: string
        network?: string
        provider?: string
        walletAddress?: string
        quote?: any
        scenarioOutcome?: 'pending' | 'confirmed' | 'refused'
      }

      const result = placeOrder({
        idempotencyKey,
        userId: session.userId,
        guestCartId: body.guestCartId ?? cartIdFromHeaders(request.headers),
        network: (body.network ?? 'Ethereum') as any,
        provider: body.provider ?? 'MetaMask',
        walletAddress: body.walletAddress ?? '',
        quote: body.quote,
        scenarioOutcome: body.scenarioOutcome ?? 'pending',
      })

      if (!result.ok) {
        return errorResponse(result.error.status ?? 500, result.error.code, result.error.message, result.error.fields, result.error.details, false)
      }

      const isTimeoutScenario = getActiveScenario() === 'order-timeout'
      const db = getDbRaw()
      const alreadyPending = db.orders.some((o) => o.userId === session.userId && o.status === 'pending' && o.id !== result.order.id)

      if (isTimeoutScenario && result.created && !alreadyPending) {
        return new Response(null, { status: 504, statusText: 'Gateway Timeout' })
      }

      return HttpResponse.json({ ok: true, order: result.order, created: result.created }, { status: result.created ? 201 : 200 })
    }, request)
  }),

  http.get('/api/v1/orders/:orderId', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) return errorResponse(401, 'UNAUTHENTICATED', 'Token não fornecido', {}, {}, false)
      const session = checkSession(match[1]!)
      if (!session.ok) return session.response
      const result = getOrder(String(params.orderId), session.userId)
      if (!result.ok) return errorResponse(result.error.status, result.error.code, result.error.message, {}, {}, false)
      return HttpResponse.json({ ok: true, order: result.order })
    }, request)
  }),

  http.post('/api/v1/orders/:orderId/settle', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) return errorResponse(401, 'UNAUTHENTICATED', 'Token não fornecido', {}, {}, false)
      const session = checkSession(match[1]!)
      if (!session.ok) return session.response
      const result = settleOrder(String(params.orderId ?? ''))
      if (!result.ok) return errorResponse(result.error.status, result.error.code, result.error.message, {}, {}, false)
      return HttpResponse.json({ ok: true, order: result.order })
    }, request)
  }),

  http.get('/api/v1/me/orders', async ({ request }) => {
    return withScenarioHandler(async () => {
      const auth = request.headers.get('Authorization') ?? ''
      const match = /^Bearer\s+(.+)$/i.exec(auth)
      if (!match) return errorResponse(401, 'UNAUTHENTICATED', 'Token não fornecido', {}, {}, false)
      const session = checkSession(match[1]!)
      if (!session.ok) return session.response
      const url = new URL(request.url)
      const status = url.searchParams.get('status') as any
      const db = getDbRaw()
      let orders = db.orders.filter((o) => o.userId === session.userId)
      if (status) orders = orders.filter((o) => o.status === status)
      return HttpResponse.json({ ok: true, orders })
    }, request)
  }),

  // --- Account ---
  http.get('/api/v1/me/profile', async ({ request }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const user = getUser(session.userId)
      if (!user) return errorResponse(404, 'NOT_FOUND', 'Usuário não encontrado', {}, {}, false)
      return HttpResponse.json({
        ok: true,
        user: { id: user.id, username: user.username, email: user.email, ensName: user.wallets.principal?.ensName ?? null, wallets: user.wallets },
      })
    }, request)
  }),

  http.patch('/api/v1/me/profile', async ({ request }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const body = (await request.json()) as { displayName?: string; username?: string; email?: string; ensName?: string | null }
      const result = updateProfile(session.userId, body)
      if (!result.ok) return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, undefined, false)
      return HttpResponse.json({ ok: true, user: result.user })
    }, request)
  }),

  http.delete('/api/v1/me/avatar', async ({ request }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      return HttpResponse.json({ ok: true, message: 'Avatar removido' })
    }, request)
  }),

  http.post('/api/v1/me/password', async ({ request }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const body = (await request.json()) as { currentPassword?: string; newPassword?: string; confirmPassword?: string }
      const result = changePassword(session.userId, {
        currentPassword: body.currentPassword ?? '',
        newPassword: body.newPassword ?? '',
        confirmPassword: body.confirmPassword ?? '',
      })
      if (!result.ok) return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, undefined, false)
      return HttpResponse.json({ ok: true })
    }, request)
  }),

  http.get('/api/v1/me/wallets', async ({ request }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const user = getUser(session.userId)
      if (!user) return errorResponse(404, 'NOT_FOUND', 'Usuário não encontrado', {}, {}, false)
      return HttpResponse.json({ ok: true, wallets: user.wallets })
    }, request)
  }),

  http.put('/api/v1/me/wallets/:slot', async ({ request, params }) => {
    return withScenarioHandler(async () => {
      const authResult = requireAuth(request.headers)
      if (!authResult.ok) return authResult.response
      const session = checkSession(authResult.token)
      if (!session.ok) return session.response
      const body = (await request.json()) as any
      const result = upsertWallet(session.userId, { slot: (body.slot ?? params.slot) as any, ...body })
      if (!result.ok) return errorResponse(result.error.status, result.error.code, result.error.message, result.error.fields, undefined, false)
      return HttpResponse.json({ ok: true, wallet: result.wallet })
    }, request)
  }),

  // --- Controle de mocks (apenas para testes e painel de demonstração) ---
  http.post('/__mock/restore-db', async ({ request }) => {
    return withScenarioHandler(async () => {
      const body = (await request.json()) as { db: any }
      if (!body || !body.db) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Corpo inválido', {}, {}, false)
      }
      const { loadFixtures } = await import('../db/store')
      loadFixtures(body.db)
      return HttpResponse.json({ ok: true })
    }, request)
  }),

  http.post('/__mock/reset', async ({ request }) => {
    return withScenarioHandler(async () => {
      const { loadFixtures } = await import('../db/store')
      const { createFixturesDb } = await import('../fixtures')
      loadFixtures(createFixturesDb())
      return HttpResponse.json({ ok: true })
    }, request)
  }),

  http.get('/__mock/scenario', async ({ request }) => {
    return withScenarioHandler(async () => {
      return HttpResponse.json({ scenario: getActiveScenario() })
    }, request)
  }),
]

export const restHandlers = REST_HANDLERS
