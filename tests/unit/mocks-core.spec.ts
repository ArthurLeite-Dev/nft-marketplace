import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { sha256Hex, stableStringify } from '../../src/mocks/lib/sha256'
import { dropMemoryCache, registerFixtures, resetDb, getDbRaw } from '../../src/mocks/db/store'
import { createFixturesDb } from '../../src/mocks/fixtures'
import { handleApi, type ApiResult } from '../../src/mocks/api'
import { subscribeEvents } from '../../src/mocks/events'
import { advanceClock } from '../../src/mocks/db/store'
import { setScenario, createMockControl } from '../../src/mocks/control'
import { settleDueOrders } from '../../src/mocks/domain/checkout'
import { applyNftUpdate } from '../../src/mocks/domain/nft-updates'
import type { ScenarioId } from '../../src/mocks/scenarios'
import { CartResponseSchema } from '../../src/api/contracts/cart'
import { QuoteResponseSchema, WalletConnectionResponseSchema } from '../../src/api/contracts/checkout'
import { OrderEnvelopeSchema, OrderResponseSchema } from '../../src/api/contracts/orders'
import { RealtimeEventSchema, type RealtimeEvent } from '../../src/api/contracts/events'
import { AuthResponseSchema } from '../../src/api/contracts/auth'
import { NftListResponseSchema, NftDetailSchema } from '../../src/api/contracts/nfts'
import { FavoritesResponseSchema } from '../../src/api/contracts/favorites'

/** localStorage de mentira: o servidor simulado só precisa de get/set/remove. */
class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

const ANA = { email: 'ana@jungle.test', password: 'Colecao@2026' }
const BRUNO = { email: 'bruno@jungle.test', password: 'Galeria@2026' }
const COLLECTOR = { displayName: 'Ana Coleção', username: 'ana_colecao', email: 'ana@jungle.test' }

function call(method: string, path: string, opts: { body?: unknown; token?: string; cartId?: string; key?: string; scenario?: ScenarioId; query?: Record<string, string> } = {}): ApiResult {
  const headers: Record<string, string> = {}
  if (opts.token) headers.authorization = `Bearer ${opts.token}`
  if (opts.cartId) headers['x-cart-id'] = opts.cartId
  if (opts.key) headers['idempotency-key'] = opts.key
  return handleApi({ method, path, query: new URLSearchParams(opts.query), headers, body: opts.body, scenario: opts.scenario ?? 'default' })
}

function login(creds = ANA): string {
  const r = call('POST', '/auth/login', { body: creds })
  expect(r.status).toBe(200)
  return AuthResponseSchema.parse(r.body).token
}

/** Do carrinho à cotação e à carteira conectada. Devolve tudo que o pedido precisa. */
function prepareCheckout(
  token: string,
  network: 'Ethereum' | 'Polygon' | 'Base' = 'Ethereum',
  item: { nftId: string; editionId: string; quantity: number } = { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 2 },
) {
  const add = call('POST', '/cart/items', { token, body: item })
  expect(add.status).toBe(200)
  const q = call('POST', '/checkout/quote', { token, body: { network } })
  expect(q.status).toBe(201)
  const quote = QuoteResponseSchema.parse(q.body)
  const w = call('POST', '/wallet-connections', { token, body: { address: '0x71C84517C3743301AE53675C7FB78B2CE7756CF4', provider: 'MetaMask', network } })
  expect(w.status).toBe(201)
  const wallet = WalletConnectionResponseSchema.parse(w.body)
  return { quote, wallet, body: { quoteId: quote.quoteId, walletConnectionId: wallet.connectionId, collector: COLLECTOR } }
}

test.beforeEach(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage()
  registerFixtures(createFixturesDb)
  dropMemoryCache()
  resetDb()
  createMockControl().reset()
})

test.describe('SHA-256 e hash estável', () => {
  test('sha256Hex confere com o crypto do Node (vazio, curto, 55/56/64 bytes, longo, acentos)', () => {
    const inputs = ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'x'.repeat(1000), 'Coleção ✓ 日本語', 'jungle-ana-saltColecao@2026']
    for (const s of inputs) expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'))
  })

  test('stableStringify ordena chaves em TODOS os níveis (a versão antiga ignorava campos aninhados)', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }))
    expect(stableStringify({ lines: [{ q: 1 }] })).not.toBe(stableStringify({ lines: [{ q: 2 }] }))
  })
})

test.describe('Sessão e persistência', () => {
  test('as credenciais documentadas de Ana e Bruno autenticam (regressão: login retornava 500)', () => {
    for (const creds of [ANA, BRUNO]) {
      const r = call('POST', '/auth/login', { body: creds })
      expect(r.status).toBe(200)
      expect(AuthResponseSchema.safeParse(r.body).success).toBe(true)
    }
  })

  test('credenciais inválidas devolvem 401 INVALID_CREDENTIALS (e não 500)', () => {
    const r = call('POST', '/auth/login', { body: { email: ANA.email, password: 'errada123' } })
    expect(r.status).toBe(401)
    expect((r.body as { error: { code: string } }).error.code).toBe('INVALID_CREDENTIALS')
  })

  test('cadastro persiste e sobrevive a refresh (cache em memória descartado, localStorage mantido)', () => {
    const reg = call('POST', '/auth/register', { body: { username: 'novo_user', email: 'novo@jungle.test', password: 'Segredo123' } })
    expect(reg.status).toBe(201)
    dropMemoryCache() // simula o refresh da página
    expect(call('POST', '/auth/login', { body: { email: 'novo@jungle.test', password: 'Segredo123' } }).status).toBe(200)
    expect(getDbRaw().users.some((u) => u.email === 'novo@jungle.test')).toBe(true)
  })

  test('conflito de cadastro (e-mail e usuário) e erro de validação por campo', () => {
    const dup = call('POST', '/auth/register', { body: { username: 'outro', email: ANA.email, password: 'Segredo123' } })
    expect(dup.status).toBe(409)
    const bad = call('POST', '/auth/register', { body: { username: 'x', email: 'inválido', password: '123' } })
    expect(bad.status).toBe(422)
    expect(Object.keys((bad.body as { error: { fields: object } }).error.fields)).toEqual(expect.arrayContaining(['username', 'email', 'password']))
  })

  test('token inválido ou de sessão encerrada responde SESSION_EXPIRED; logout invalida', () => {
    const token = login()
    expect(call('GET', '/me/profile', { token }).status).toBe(200)
    call('POST', '/auth/logout', { token })
    const r = call('GET', '/me/profile', { token })
    expect(r.status).toBe(401)
    expect((r.body as { error: { code: string } }).error.code).toBe('SESSION_EXPIRED')
    expect((call('GET', '/me/profile').body as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED')
  })

  test('o perfil nunca expõe hash de senha nem salt', () => {
    const token = login()
    const text = JSON.stringify(call('GET', '/me/profile', { token }).body)
    expect(text).not.toContain('passwordHash')
    expect(text).not.toContain('salt')
  })

  test('cenário session-expired expira sessões abertas antes da ativação', () => {
    const token = login()
    advanceClock(1000)
    setScenario('session-expired')
    const r = call('GET', '/me/profile', { token, scenario: 'session-expired' })
    expect(r.status).toBe(401)
    // um login feito DEPOIS da ativação continua válido
    advanceClock(1000)
    const fresh = login()
    expect(call('GET', '/me/profile', { token: fresh, scenario: 'session-expired' }).status).toBe(200)
  })

  test('cenário forbidden: rotas autenticadas respondem 403', () => {
    const token = login()
    expect(call('GET', '/me/orders', { token, scenario: 'forbidden' }).status).toBe(403)
  })
})

test.describe('Catálogo', () => {
  test('listagem, filtros combinados, ordenação e paginação cumprem o contrato', () => {
    const all = call('GET', '/nfts')
    const parsed = NftListResponseSchema.parse(all.body)
    expect(parsed.pagination.pageSize).toBe(9)
    expect(parsed.pagination.totalItems).toBeGreaterThan(9)

    const p2 = NftListResponseSchema.parse(call('GET', '/nfts', { query: { page: '2' } }).body)
    expect(p2.pagination.page).toBe(2)
    expect(p2.items.map((i) => i.id)).not.toEqual(parsed.items.map((i) => i.id))

    const asc = NftListResponseSchema.parse(call('GET', '/nfts', { query: { sort: 'price-asc' } }).body)
    const prices = asc.items.map((i) => parseFloat(i.priceEth))
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)

    const combo = NftListResponseSchema.parse(call('GET', '/nfts', { query: { networks: 'Polygon', sort: 'price-desc' } }).body)
    expect(combo.items.every((i) => i.network === 'Polygon')).toBe(true)

    const none = NftListResponseSchema.parse(call('GET', '/nfts', { query: { q: 'zzzzzz-inexistente' } }).body)
    expect(none.items).toHaveLength(0)
  })

  test('cenário empty e detalhe inexistente (404)', () => {
    expect(NftListResponseSchema.parse(call('GET', '/nfts', { scenario: 'empty' }).body).items).toHaveLength(0)
    expect(call('GET', '/nfts/nft_999').status).toBe(404)
    expect(NftDetailSchema.safeParse(call('GET', '/nfts/nft_01').body).success).toBe(true)
  })
})

test.describe('Favoritos', () => {
  test('persistem por usuário e não vazam entre usuários', () => {
    const ana = login(ANA)
    const bruno = login(BRUNO)
    expect(FavoritesResponseSchema.parse(call('GET', '/me/favorites', { token: ana }).body).nftIds).toEqual(['nft_01', 'nft_08'])
    expect(FavoritesResponseSchema.parse(call('GET', '/me/favorites', { token: bruno }).body).nftIds).toEqual([])
    expect(call('PUT', '/me/favorites/nft_05', { token: bruno }).status).toBe(200)
    expect(FavoritesResponseSchema.parse(call('GET', '/me/favorites', { token: bruno }).body).nftIds).toEqual(['nft_05'])
    expect(FavoritesResponseSchema.parse(call('GET', '/me/favorites', { token: ana }).body).nftIds).not.toContain('nft_05')
    call('DELETE', '/me/favorites/nft_05', { token: bruno })
    expect(FavoritesResponseSchema.parse(call('GET', '/me/favorites', { token: bruno }).body).nftIds).toEqual([])
  })
})

test.describe('Carrinho', () => {
  test('visitante: adiciona, totais são calculados e a resposta cumpre o contrato (regressão: totais ficavam em 0 e faltava artwork)', () => {
    const r = call('POST', '/cart/items', { cartId: 'guest_1', body: { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 2 } })
    expect(r.status).toBe(200)
    const cart = CartResponseSchema.parse(r.body)
    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0]!.artwork.url).toBeTruthy()
    expect(cart.totals.subtotalEth).not.toBe('0')
    expect(cart.totals.totalEth).not.toBe('0')
    // persiste e é lido de volta
    dropMemoryCache()
    expect(CartResponseSchema.parse(call('GET', '/cart', { cartId: 'guest_1' }).body).lines).toHaveLength(1)
    // outro visitante não enxerga
    expect(CartResponseSchema.parse(call('GET', '/cart', { cartId: 'guest_2' }).body).lines).toHaveLength(0)
  })

  test('edição aberta (available = null) pode ser comprada, respeitando o teto por pedido', () => {
    const open = getDbRaw().nfts.flatMap((n) => n.editions.map((e) => ({ n, e }))).find(({ e }) => e.available === null)
    test.skip(!open, 'sem edição aberta nas fixtures')
    const { n, e } = open!
    const r = call('POST', '/cart/items', { cartId: 'g', body: { nftId: n.id, editionId: e.id, quantity: 1 } })
    expect(r.status).toBe(200)
    const over = call('POST', '/cart/items', { cartId: 'g', body: { nftId: n.id, editionId: e.id, quantity: 999 } })
    expect(over.status).toBe(409)
  })

  test('limite de quantidade e item inexistente', () => {
    const over = call('POST', '/cart/items', { cartId: 'g', body: { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 999 } })
    expect(over.status).toBe(409)
    expect((over.body as { error: { code: string } }).error.code).toBe('AVAILABILITY_CONFLICT')
    expect(call('POST', '/cart/items', { cartId: 'g', body: { nftId: 'nft_999', editionId: 'x', quantity: 1 } }).status).toBe(404)
  })

  test('após o login: merge preserva os itens do visitante e quantidade/remoção/cupom funcionam (regressão: operavam no carrinho errado)', () => {
    call('POST', '/cart/items', { cartId: 'guest_9', body: { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 1 } })
    const token = login()
    const merged = call('POST', '/cart/merge', { token, cartId: 'guest_9' })
    expect(merged.status).toBe(200)
    const cart = CartResponseSchema.parse((merged.body as { cart: unknown }).cart)
    expect(cart.lines).toHaveLength(1)
    const lineId = cart.lines[0]!.lineId

    const upd = call('PATCH', `/cart/items/${lineId}`, { token, cartId: 'guest_9', body: { quantity: 3 } })
    expect(upd.status).toBe(200)
    expect(CartResponseSchema.parse(upd.body).lines[0]!.quantity).toBe(3)

    const cp = call('PUT', '/cart/coupon', { token, body: { code: 'jungle10' } })
    expect(cp.status).toBe(200)
    const withCoupon = CartResponseSchema.parse(cp.body)
    expect(withCoupon.couponDiscountBp).toBe(1000)
    expect(withCoupon.totals.discountEth).not.toBe('0')

    expect(call('PUT', '/cart/coupon', { token, body: { code: 'EARLY25' } }).body).toMatchObject({ error: { code: 'COUPON_EXPIRED' } })
    expect(call('PUT', '/cart/coupon', { token, body: { code: 'NAOEXISTE' } }).body).toMatchObject({ error: { code: 'COUPON_INVALID' } })
    expect(call('PUT', '/cart/coupon', { token, body: { code: 'JUNGLE10' }, scenario: 'coupon-expired' }).body).toMatchObject({ error: { code: 'COUPON_EXPIRED' } })
    expect(CartResponseSchema.parse(call('DELETE', '/cart/coupon', { token }).body).couponCode).toBeNull()

    const del = call('DELETE', `/cart/items/${lineId}`, { token })
    expect(CartResponseSchema.parse(del.body).lines).toHaveLength(0)
    // o merge é idempotente
    expect(call('POST', '/cart/merge', { token, cartId: 'guest_9' }).status).toBe(200)
  })

  test('isolamento: o carrinho de um usuário nunca aparece para outro', () => {
    const ana = login(ANA)
    const bruno = login(BRUNO)
    call('POST', '/cart/items', { token: ana, body: { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 1 } })
    expect(CartResponseSchema.parse(call('GET', '/cart', { token: ana }).body).lines).toHaveLength(1)
    expect(CartResponseSchema.parse(call('GET', '/cart', { token: bruno }).body).lines).toHaveLength(0)
  })
})

test.describe('Cotação, carteira e pedido', () => {
  test('cotação e conexão de carteira cumprem o contrato; carrinho vazio é rejeitado', () => {
    const token = login()
    expect(call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' } }).status).toBe(422)
    const { quote } = prepareCheckout(token)
    expect(quote.totals.networkFeeEth).toBe('0.012')
    expect(quote.lines).toHaveLength(1)
  })

  test('compra completa: pedido nasce pendente, é liquidado como confirmado e o recibo cumpre o contrato', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    const created = call('POST', '/orders', { token, key: 'k-1', body })
    expect(created.status).toBe(201)
    const env = OrderEnvelopeSchema.parse(created.body)
    expect(env.created).toBe(true)
    expect(env.order.status).toBe('pending')
    expect(env.order.transactionHash).toBeNull()

    // antes do prazo continua pendente
    expect(OrderResponseSchema.parse(call('GET', `/orders/${env.order.id}`, { token }).body).status).toBe('pending')
    advanceClock(3500)
    const done = OrderResponseSchema.parse(call('GET', `/orders/${env.order.id}`, { token }).body)
    expect(done.status).toBe('confirmed')
    expect(done.transactionHash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(done.settledAt).not.toBeNull()
    // o carrinho teve removidos os itens comprados
    expect(CartResponseSchema.parse(call('GET', '/cart', { token }).body).lines).toHaveLength(0)
  })

  test('idempotência: mesma chave+conteúdo recupera o MESMO pedido; conteúdo diferente gera conflito (regressão: o hash ignorava campos aninhados)', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    const first = OrderEnvelopeSchema.parse(call('POST', '/orders', { token, key: 'k-2', body }).body)
    const replay = call('POST', '/orders', { token, key: 'k-2', body })
    expect(replay.status).toBe(200)
    const again = OrderEnvelopeSchema.parse(replay.body)
    expect(again.created).toBe(false)
    expect(again.order.id).toBe(first.order.id)
    expect(getDbRaw().orders).toHaveLength(1)

    const different = call('POST', '/orders', { token, key: 'k-2', body: { ...body, collector: { ...COLLECTOR, displayName: 'Outra Pessoa' } } })
    expect(different.status).toBe(409)
    expect((different.body as { error: { code: string } }).error.code).toBe('IDEMPOTENCY_KEY_REUSED')
  })

  test('cenário order-timeout: o pedido é criado, a 1ª resposta se perde e o reenvio com a mesma chave recupera o pedido', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    const lost = call('POST', '/orders', { token, key: 'k-3', body, scenario: 'order-timeout' })
    expect(lost.lostResponse).toBe(true)
    expect(getDbRaw().orders).toHaveLength(1)
    const retry = call('POST', '/orders', { token, key: 'k-3', body, scenario: 'order-timeout' })
    expect(retry.lostResponse).toBeUndefined()
    expect(OrderEnvelopeSchema.parse(retry.body).created).toBe(false)
    expect(getDbRaw().orders).toHaveLength(1)
  })

  test('cenário payment-refused: pedido recusado, itens preservados no carrinho e sem transação', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    const env = OrderEnvelopeSchema.parse(call('POST', '/orders', { token, key: 'k-4', body, scenario: 'payment-refused' }).body)
    advanceClock(3500)
    const done = OrderResponseSchema.parse(call('GET', `/orders/${env.order.id}`, { token }).body)
    expect(done.status).toBe('refused')
    expect(done.transactionHash).toBeNull()
    expect(done.failureReason).toBeTruthy()
    expect(CartResponseSchema.parse(call('GET', '/cart', { token }).body).lines).toHaveLength(1)
  })

  test('revalidação: preço alterado depois da cotação impede o pedido (QUOTE_CHANGED) e nenhum pedido é criado', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    expect(applyNftUpdate('nft_07', { editions: { ed_07_2: { priceEth: '0.90' } } }).ok).toBe(true)
    const r = call('POST', '/orders', { token, key: 'k-5', body })
    expect(r.status).toBe(409)
    expect((r.body as { error: { code: string } }).error.code).toBe('QUOTE_CHANGED')
    expect(getDbRaw().orders).toHaveLength(0)
    // a nova cotação exige aceitar o novo preço no carrinho
    const cart = CartResponseSchema.parse(call('GET', '/cart', { token }).body)
    expect(cart.lines[0]!.status).toBe('price-changed')
    expect(call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' } }).status).toBe(409)
    call('PATCH', `/cart/items/${cart.lines[0]!.lineId}`, { token, body: { acceptPrice: true } })
    expect(call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' } }).status).toBe(201)
  })

  test('revalidação: edição esgotada depois da cotação (AVAILABILITY_CONFLICT) e cotação expirada (QUOTE_EXPIRED)', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    advanceClock(6 * 60 * 1000)
    const expired = call('POST', '/orders', { token, key: 'k-6', body })
    expect(expired.status).toBe(410)
    const t2 = login(BRUNO)
    const prep = prepareCheckout(t2)
    applyNftUpdate('nft_07', { editions: { ed_07_2: { available: 0 } } })
    const r = call('POST', '/orders', { token: t2, key: 'k-7', body: prep.body })
    expect(r.status).toBe(409)
    expect((r.body as { error: { code: string } }).error.code).toBe('AVAILABILITY_CONFLICT')
  })

  test('recibo é um snapshot: alterações posteriores no catálogo não mudam o pedido confirmado', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    const env = OrderEnvelopeSchema.parse(call('POST', '/orders', { token, key: 'k-8', body }).body)
    advanceClock(3500)
    const before = OrderResponseSchema.parse(call('GET', `/orders/${env.order.id}`, { token }).body)
    applyNftUpdate('nft_07', { editions: { ed_07_2: { priceEth: '9.99' } } })
    const after = OrderResponseSchema.parse(call('GET', `/orders/${env.order.id}`, { token }).body)
    expect(after.lines).toEqual(before.lines)
    expect(after.totals).toEqual(before.totals)
  })

  test('isolamento: outro usuário não lê nem lista o pedido (404/lista vazia)', () => {
    const ana = login(ANA)
    const bruno = login(BRUNO)
    const { body } = prepareCheckout(ana)
    const env = OrderEnvelopeSchema.parse(call('POST', '/orders', { token: ana, key: 'k-9', body }).body)
    expect(call('GET', `/orders/${env.order.id}`, { token: bruno }).status).toBe(404)
    expect((call('GET', '/me/orders', { token: bruno }).body as { orders: unknown[] }).orders).toHaveLength(0)
    expect((call('GET', '/me/orders', { token: ana }).body as { orders: unknown[] }).orders).toHaveLength(1)
  })

  test('carteira: cenário wallet-rejected recusa só a 1ª conexão; desconexão é registrada', () => {
    const token = login()
    const reqBody = { address: '0x71C84517C3743301AE53675C7FB78B2CE7756CF4', provider: 'MetaMask', network: 'Ethereum' }
    const first = call('POST', '/wallet-connections', { token, body: reqBody, scenario: 'wallet-rejected' })
    expect(first.status).toBe(409)
    expect((first.body as { error: { code: string } }).error.code).toBe('WALLET_REJECTED')
    const second = call('POST', '/wallet-connections', { token, body: reqBody, scenario: 'wallet-rejected' })
    expect(second.status).toBe(201)
    const id = WalletConnectionResponseSchema.parse(second.body).connectionId
    expect(call('DELETE', `/wallet-connections/${id}`, { token }).status).toBe(200)
    // com a carteira desconectada o pedido é impedido
    const prep = prepareCheckout(token)
    call('DELETE', `/wallet-connections/${prep.wallet.connectionId}`, { token })
    expect((call('POST', '/orders', { token, key: 'k-10', body: prep.body }).body as { error: { code: string } }).error.code).toBe('WALLET_DISCONNECTED')
  })

  test('validação do colecionador devolve erros por campo', () => {
    const token = login()
    const { body } = prepareCheckout(token)
    const r = call('POST', '/orders', { token, key: 'k-11', body: { ...body, collector: { displayName: '', username: 'a', email: 'x' } } })
    expect(r.status).toBe(422)
    expect(Object.keys((r.body as { error: { fields: object } }).error.fields)).toEqual(expect.arrayContaining(['collector.displayName', 'collector.username', 'collector.email']))
  })
})

test.describe('Eventos em tempo real (origem: servidor simulado)', () => {
  test('nft.updated e order.updated saem do domínio com identidade estável e versão crescente', () => {
    const events: RealtimeEvent[] = []
    const off = subscribeEvents((e) => events.push(e))
    applyNftUpdate('nft_03', { editions: { ed_03_1: { priceEth: '1.20' } } })
    applyNftUpdate('nft_03', { editions: { ed_03_1: { priceEth: '1.30' } } })
    const token = login()
    // edição LIMITADA (12 unidades): a compra confirmada baixa o estoque e emite nft.updated
    const { body } = prepareCheckout(token, 'Ethereum', { nftId: 'nft_03', editionId: 'ed_03_1', quantity: 2 })
    const env = OrderEnvelopeSchema.parse(call('POST', '/orders', { token, key: 'k-12', body }).body)
    advanceClock(3500)
    settleDueOrders() // liquidação ocorre quando o prazo (relógio simulado) vence
    off()

    for (const e of events) expect(RealtimeEventSchema.safeParse(e).success).toBe(true)
    const nftEvents = events.filter((e) => e.type === 'nft.updated' && e.resource.id === 'nft_03')
    expect(nftEvents).toHaveLength(3) // 2 alterações de preço + 1 baixa de estoque da compra
    const versions = nftEvents.map((e) => e.version)
    expect(versions).toEqual([...versions].sort((a, b) => a - b))
    expect(new Set(nftEvents.map((e) => e.eventId)).size).toBe(3)
    const last = nftEvents[2]!
    expect(last.type === 'nft.updated' && last.data.editions.find((e) => e.id === 'ed_03_1')!.available).toBe(10)
    const order = events.find((e) => e.type === 'order.updated')
    expect(order).toBeTruthy()
    expect(order!.type === 'order.updated' && order!.data.orderId).toBe(env.order.id)
    expect(order!.type === 'order.updated' && order!.data.status).toBe('confirmed')
    expect(order!.version).toBe(2) // v1 = pendente, v2 = liquidação
  })

  test('REST e evento concordam: o preço servido pelo REST é o do último evento', () => {
    const events: RealtimeEvent[] = []
    const off = subscribeEvents((e) => events.push(e))
    applyNftUpdate('nft_03', { editions: { ed_03_1: { priceEth: '1.35' } } })
    off()
    const detail = NftDetailSchema.parse(call('GET', '/nfts/nft_03').body)
    const ev = events[0]!
    expect(ev.type).toBe('nft.updated')
    if (ev.type === 'nft.updated') {
      expect(detail.editions.find((e) => e.id === 'ed_03_1')!.priceEth).toBe('1.35')
      expect(ev.data.editions.find((e) => e.id === 'ed_03_1')!.priceEth).toBe('1.35')
      expect(detail.version).toBe(ev.version)
    }
  })

  test('cenário price-changed: na 2ª cotação o preço do 1º item muda (com evento) e a cotação é bloqueada', () => {
    const token = login()
    call('POST', '/cart/items', { token, body: { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 1 } })
    const events: RealtimeEvent[] = []
    const off = subscribeEvents((e) => events.push(e))
    expect(call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' }, scenario: 'price-changed' }).status).toBe(201)
    const second = call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' }, scenario: 'price-changed' })
    off()
    expect(second.status).toBe(409)
    expect((second.body as { error: { code: string } }).error.code).toBe('QUOTE_CHANGED')
    expect(events.some((e) => e.type === 'nft.updated')).toBe(true)
  })

  test('cenário sold-out: na 2ª cotação a edição esgota', () => {
    const token = login()
    call('POST', '/cart/items', { token, body: { nftId: 'nft_07', editionId: 'ed_07_2', quantity: 1 } })
    call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' }, scenario: 'sold-out' })
    const second = call('POST', '/checkout/quote', { token, body: { network: 'Ethereum' }, scenario: 'sold-out' })
    expect((second.body as { error: { code: string } }).error.code).toBe('AVAILABILITY_CONFLICT')
  })

  test('desconexão de carteira emite wallet.disconnected para o dono', () => {
    const token = login()
    const prep = prepareCheckout(token)
    const events: RealtimeEvent[] = []
    const off = subscribeEvents((e) => events.push(e))
    expect(createMockControl().disconnectWallet()).toBe(true)
    off()
    const ev = events.find((e) => e.type === 'wallet.disconnected')
    expect(ev && ev.type === 'wallet.disconnected' && ev.data.connectionId).toBe(prep.wallet.connectionId)
  })
})

test.describe('Reset determinístico', () => {
  test('reset restaura integralmente o cenário conhecido', () => {
    const token = login()
    prepareCheckout(token)
    createMockControl().reset()
    const db = getDbRaw()
    expect(db.carts).toHaveLength(0)
    expect(db.orders).toHaveLength(0)
    expect(db.sessions).toHaveLength(0)
    expect(db.seq).toBe(0)
    expect(db.users).toHaveLength(2)
  })

  test('ids são determinísticos entre execuções idênticas', () => {
    login()
    prepareCheckout(login())
    const ids1 = getDbRaw().quotes.map((q) => q.id)
    createMockControl().reset()
    login()
    prepareCheckout(login())
    expect(getDbRaw().quotes.map((q) => q.id)).toEqual(ids1)
  })
})

import { planNetwork, resetNetworkState } from '../../src/mocks/respond'
import { createScenarioEffect, SCENARIOS } from '../../src/mocks/scenarios'

test.describe('Cenários de rede (latência, offline, 5xx, flaky)', () => {
  test.beforeEach(() => resetNetworkState())

  test('offline = erro de conexão; server-error = 503 em tudo', () => {
    expect(planNetwork(createScenarioEffect('offline'), 'GET /nfts').kind).toBe('network-error')
    const plan = planNetwork(createScenarioEffect('server-error'), 'GET /nfts')
    expect(plan).toMatchObject({ kind: 'http-error', status: 503, code: 'SERVER_ERROR' })
  })

  test('flaky: cada requisição falha 3x e funciona na 4a, contando por requisição', () => {
    const effect = createScenarioEffect('flaky')
    const kinds = Array.from({ length: 4 }, () => planNetwork(effect, 'GET /cart').kind)
    expect(kinds).toEqual(['http-error', 'http-error', 'http-error', 'proceed'])
    // outra requisição tem a sua própria contagem
    expect(planNetwork(effect, 'GET /nfts').kind).toBe('http-error')
  })

  test('latência variável é determinística (mesma semente, mesma sequência) e a "slow" é maior que a padrão', () => {
    const seq = (id: 'out-of-order' | 'slow' | 'default') => {
      const effect = createScenarioEffect(id)
      return Array.from({ length: 5 }, () => planNetwork(effect, 'GET /x').delayMs)
    }
    expect(seq('out-of-order')).toEqual(seq('out-of-order'))
    expect(new Set(seq('out-of-order')).size).toBeGreaterThan(1)
    expect(Math.min(...seq('slow'))).toBeGreaterThan(Math.max(...seq('default')))
  })

  test('todos os cenários documentados existem e têm efeito definido', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(16)
    for (const id of SCENARIOS) expect(() => createScenarioEffect(id)).not.toThrow()
  })
})

test.describe('Perfil, avatar, senha e carteiras (REST simulado)', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHuWc5QAAAABJRU5ErkJggg=='

  test('GET/PATCH perfil: devolve usuário público, valida campos e conflito de e-mail', () => {
    const token = login()
    const profile = (call('GET', '/me/profile', { token }).body as { user: { email: string; wallets: { principal?: { address: string } } } }).user
    expect(profile.email).toBe(ANA.email)
    expect(profile.wallets.principal?.address).toMatch(/^0x[0-9a-fA-F]{40}$/)

    const ok = call('PATCH', '/me/profile', { token, body: { username: 'ana_renomeada' } })
    expect(ok.status).toBe(200)
    dropMemoryCache() // refresh
    expect((call('GET', '/me/profile', { token }).body as { user: { username: string } }).user.username).toBe('ana_renomeada')

    expect(call('PATCH', '/me/profile', { token, body: { email: 'invalido' } }).status).toBe(422)
    const dup = call('PATCH', '/me/profile', { token, body: { email: BRUNO.email } })
    expect(dup.status).toBe(422) // conflito de validação, com mensagem no campo
    expect((dup.body as { error: { fields: Record<string, string> } }).error.fields.email).toMatch(/já cadastrado/)
  })

  test('avatar: aceita imagem válida, recusa tipo inválido e remove; persiste após refresh', () => {
    const token = login()
    expect(call('PUT', '/me/avatar', { token, body: { avatarUrl: 'data:text/plain;base64,aGk=' } }).status).toBe(422)
    const set = call('PUT', '/me/avatar', { token, body: { avatarUrl: PNG } })
    expect(set.status).toBe(200)
    dropMemoryCache()
    expect((call('GET', '/me/profile', { token }).body as { user: { avatarUrl: string | null } }).user.avatarUrl).toBe(PNG)
    expect(call('DELETE', '/me/avatar', { token }).status).toBe(200)
    expect((call('GET', '/me/profile', { token }).body as { user: { avatarUrl: string | null } }).user.avatarUrl).toBeNull()
  })

  test('senha: atual incorreta e nova fraca são recusadas; troca válida permite novo login e invalida a antiga', () => {
    const token = login()
    const wrong = call('POST', '/me/password', { token, body: { currentPassword: 'errada@123', newPassword: 'NovaSenha123', confirmPassword: 'NovaSenha123' } })
    expect(wrong.status).toBeGreaterThanOrEqual(400)
    const weak = call('POST', '/me/password', { token, body: { currentPassword: ANA.password, newPassword: 'abc', confirmPassword: 'abc' } })
    expect(weak.status).toBe(422)
    const good = call('POST', '/me/password', { token, body: { currentPassword: ANA.password, newPassword: 'NovaSenha123', confirmPassword: 'NovaSenha123' } })
    expect(good.status).toBe(200)
    expect(call('POST', '/auth/login', { body: ANA }).status).toBe(401)
    expect(call('POST', '/auth/login', { body: { email: ANA.email, password: 'NovaSenha123' } }).status).toBe(200)
  })

  test('carteiras: endereço inválido recusado; principal/secundária salvas e persistem; endereço de outro usuário em uso é recusado', () => {
    const token = login()
    const base = { nickname: 'Cofre', displayName: 'Cofre', profileName: 'Cofre', network: 'Base', walletType: 'MetaMask', referralCode: null, email: null, ensName: null }
    expect(call('PUT', '/me/wallets/secundaria', { token, body: { ...base, address: '0x123' } }).status).toBe(422)
    const addr = '0x1111111111111111111111111111111111111111'
    // o endereço da carteira principal da própria Ana não pode ir para a secundária
    expect(call('PUT', '/me/wallets/secundaria', { token, body: { ...base, address: '0x71C84517C3743301AE53675C7FB78B2CE7756CF4' } }).status).toBe(409)
    expect(call('PUT', '/me/wallets/secundaria', { token, body: { ...base, address: addr } }).status).toBe(200)
    dropMemoryCache()
    const wallets = (call('GET', '/me/wallets', { token }).body as { wallets: { secundaria?: { address: string; network: string } } }).wallets
    expect(wallets.secundaria?.address).toBe(addr)
    expect(wallets.secundaria?.network).toBe('Base')
    // o mesmo endereço não pode ser cadastrado por outro usuário
    const bruno = login(BRUNO)
    expect(call('PUT', '/me/wallets/principal', { token: bruno, body: { ...base, address: addr } }).status).toBe(409)
  })
})
