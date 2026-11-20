import type { DbCollector, DbOrder, DbOrderLine, DbQuote, DbQuoteLine, DbWalletConnection, Network, OrderStatus } from '../db/types'
import { dbUpdate, generateId, getDbRaw, getVersion, mockNow, nextVersion, stableHash } from '../db/store'
import { sha256Hex } from '../lib/sha256'
import { publishEvent } from '../events'
import { multiplyEth } from '../../lib/eth'
import { findCart } from './cart'
import { computeTotals, evaluateLine, findEdition, pricingFingerprint } from './pricing'
import { domainError, type DomainError } from './errors'

export const QUOTE_TTL_MS = 5 * 60 * 1000
export const WALLET_CONNECTION_TTL_MS = 30 * 60 * 1000
/** Tempo (relógio simulado) entre criar o pedido e ele ser liquidado como confirmado/recusado. */
export const SETTLE_DELAY_MS = 3000

const EVM = /^0x[0-9a-fA-F]{40}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PROVIDERS = ['WalletConnect', 'MetaMask', 'Coinbase']
const NETWORKS: Network[] = ['Ethereum', 'Polygon', 'Base']

type Fail = { ok: false; error: DomainError }

export interface QuoteView {
  quoteId: string
  cartVersion: number
  network: Network
  lines: DbQuoteLine[]
  couponCode: string | null
  totals: DbQuote['totals']
  expiresAt: string
}

export interface OrderView {
  id: string
  status: OrderStatus
  network: Network
  provider: string
  walletAddress: string
  transactionHash: string | null
  lines: DbOrderLine[]
  couponCode: string | null
  couponDiscountBp: number
  totals: DbOrder['totals']
  collector: DbCollector
  quoteId: string
  version: number
  failureReason: string | null
  createdAt: string
  settledAt: string | null
}

export function quoteView(q: DbQuote): QuoteView {
  return { quoteId: q.id, cartVersion: q.cartVersion, network: q.network, lines: q.lines, couponCode: q.couponCode, totals: q.totals, expiresAt: q.expiresAt }
}

export function orderView(o: DbOrder): OrderView {
  return {
    id: o.id,
    status: o.status,
    network: o.network,
    provider: o.provider,
    walletAddress: o.walletAddress,
    transactionHash: o.transactionHash,
    lines: o.lines,
    couponCode: o.couponCode,
    couponDiscountBp: o.couponDiscountBp,
    totals: o.totals,
    collector: o.collector,
    quoteId: o.quoteId,
    version: getVersion(`order:${o.id}`),
    failureReason: o.failureReason,
    createdAt: o.createdAt,
    settledAt: o.settledAt,
  }
}

/** Precifica o carrinho do usuário com os valores ATUAIS do catálogo. */
function priceUserCart(userId: string, network: Network):
  | { ok: true; cartId: string; cartVersion: number; lines: DbQuoteLine[]; couponCode: string | null; couponDiscountBp: number; totals: DbQuote['totals']; fingerprint: string }
  | Fail {
  const cart = findCart({ userId, guestCartId: null })
  if (!cart || cart.lines.length === 0) {
    return domainError(422, 'VALIDATION_ERROR', 'Carrinho vazio', { cart: 'Adicione itens ao carrinho para continuar' })
  }
  const db = getDbRaw()
  const unavailable: string[] = []
  const changed: string[] = []
  const lines: DbQuoteLine[] = []
  for (const line of cart.lines) {
    const nft = db.nfts.find((n) => n.id === line.nftId)
    const edition = findEdition(nft, line.editionId)
    const ev = evaluateLine(line, nft)
    if (ev.status === 'unavailable' || !nft || !edition) {
      unavailable.push(line.lineId)
      continue
    }
    if (ev.status === 'price-changed') changed.push(line.lineId)
    lines.push({
      lineId: line.lineId,
      nftId: line.nftId,
      editionId: line.editionId,
      name: nft.name,
      editionLabel: edition.label,
      unitPriceEth: ev.unitPriceEth,
      quantity: line.quantity,
      subtotalEth: multiplyEth(ev.unitPriceEth, line.quantity),
    })
  }
  if (unavailable.length) {
    return domainError(409, 'AVAILABILITY_CONFLICT', 'Há itens indisponíveis no carrinho', undefined, { lineIds: unavailable })
  }
  if (changed.length) {
    return domainError(409, 'QUOTE_CHANGED', 'O preço de itens do carrinho mudou. Revise e confirme os novos valores.', undefined, { reason: 'price', lineIds: changed })
  }
  const totals = computeTotals(lines.map((l) => ({ unitPriceEth: l.unitPriceEth, quantity: l.quantity, billable: true })), cart.couponDiscountBp, network)
  const fingerprint = pricingFingerprint(lines, cart.couponCode, cart.couponDiscountBp, network, totals)
  return { ok: true, cartId: cart.id, cartVersion: cart.version, lines, couponCode: cart.couponCode, couponDiscountBp: cart.couponDiscountBp, totals, fingerprint }
}

export function createQuote(userId: string, network: Network): { ok: true; quote: QuoteView } | Fail {
  if (!NETWORKS.includes(network)) {
    return domainError(422, 'VALIDATION_ERROR', 'Rede inválida', { network: 'Escolha Ethereum, Polygon ou Base' })
  }
  const priced = priceUserCart(userId, network)
  if (!priced.ok) return priced
  const now = mockNow()
  const quote: DbQuote = {
    id: generateId('qte'),
    userId,
    cartId: priced.cartId,
    cartVersion: priced.cartVersion,
    network,
    lines: priced.lines,
    couponCode: priced.couponCode,
    couponDiscountBp: priced.couponDiscountBp,
    totals: priced.totals,
    fingerprint: priced.fingerprint,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
  }
  dbUpdate((d) => {
    d.quotes.push(quote)
    const mine = d.quotes.filter((q) => q.userId === userId)
    if (mine.length > 20) {
      const drop = new Set(mine.slice(0, mine.length - 20).map((q) => q.id))
      d.quotes = d.quotes.filter((q) => !drop.has(q.id))
    }
  })
  return { ok: true, quote: quoteView(quote) }
}

export function connectWallet(userId: string, input: { address?: unknown; provider?: unknown; network?: unknown }): { ok: true; connection: DbWalletConnection } | Fail {
  const fields: Record<string, string> = {}
  if (typeof input.address !== 'string' || !EVM.test(input.address)) fields.address = 'Endereço EVM inválido'
  if (typeof input.provider !== 'string' || !PROVIDERS.includes(input.provider)) fields.provider = 'Carteira inválida'
  if (typeof input.network !== 'string' || !NETWORKS.includes(input.network as Network)) fields.network = 'Rede inválida'
  if (Object.keys(fields).length) return domainError(422, 'VALIDATION_ERROR', 'Dados da carteira inválidos', fields)
  const now = mockNow()
  const connection: DbWalletConnection = {
    id: generateId('wc'),
    userId,
    provider: input.provider as string,
    address: input.address as string,
    network: input.network as Network,
    connectedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + WALLET_CONNECTION_TTL_MS).toISOString(),
    disconnectedAt: null,
  }
  dbUpdate((d) => {
    d.walletConnections.push(connection)
  })
  return { ok: true, connection }
}

export function disconnectWallet(userId: string, connectionId: string, reason = 'user'): { ok: true } | Fail {
  const conn = getDbRaw().walletConnections.find((c) => c.id === connectionId && c.userId === userId)
  if (!conn) return domainError(404, 'NOT_FOUND', 'Conexão de carteira não encontrada')
  if (conn.disconnectedAt) return { ok: true }
  dbUpdate((d) => {
    d.walletConnections.find((c) => c.id === connectionId)!.disconnectedAt = mockNow().toISOString()
  })
  publishEvent({
    type: 'wallet.disconnected',
    resource: { type: 'wallet', id: connectionId },
    data: { connectionId, userId, address: conn.address, reason },
  })
  return { ok: true }
}

/** Desconexão iniciada pela carteira (controle de testes). */
export function forceDisconnectActiveWallet(userId?: string): boolean {
  const conn = [...getDbRaw().walletConnections].reverse().find((c) => !c.disconnectedAt && (!userId || c.userId === userId))
  if (!conn) return false
  return disconnectWallet(conn.userId, conn.id, 'wallet').ok
}

function validateCollector(raw: unknown): { ok: true; collector: DbCollector } | { ok: false; fields: Record<string, string> } {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const opt = (v: unknown) => (str(v) ? str(v) : null)
  const fields: Record<string, string> = {}
  if (!str(c.displayName)) fields['collector.displayName'] = 'Informe o nome de exibição'
  if (str(c.username).length < 3 || str(c.username).length > 30) fields['collector.username'] = 'Usuário deve ter entre 3 e 30 caracteres'
  if (!EMAIL.test(str(c.email))) fields['collector.email'] = 'E-mail inválido'
  if (opt(c.secondaryWallet) && !EVM.test(str(c.secondaryWallet))) fields['collector.secondaryWallet'] = 'Endereço EVM inválido'
  if (str(c.note).length > 280) fields['collector.note'] = 'A observação deve ter no máximo 280 caracteres'
  if (Object.keys(fields).length) return { ok: false, fields }
  return {
    ok: true,
    collector: {
      displayName: str(c.displayName),
      username: str(c.username),
      email: str(c.email),
      profileName: opt(c.profileName),
      secondaryWallet: opt(c.secondaryWallet),
      walletType: opt(c.walletType),
      referralCode: opt(c.referralCode),
      ensName: opt(c.ensName),
      note: opt(c.note),
    },
  }
}

export interface PlaceOrderOptions {
  /** Desfecho que o pedido terá ao ser liquidado (decidido pelo cenário ativo). */
  outcome: 'confirmed' | 'refused'
}

/**
 * Cria o pedido de forma idempotente.
 *  - mesma chave + mesmo conteúdo  -> devolve o MESMO pedido (`created: false`);
 *  - mesma chave + conteúdo diferente -> 409 IDEMPOTENCY_KEY_REUSED;
 *  - antes de criar, revalida preço, disponibilidade, cupom e taxas contra a cotação (QUOTE_CHANGED).
 */
export function placeOrder(userId: string, idempotencyKey: string | null, body: unknown, opts: PlaceOrderOptions): { ok: true; order: DbOrder; created: boolean } | Fail {
  if (!idempotencyKey) return domainError(422, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório', { idempotencyKey: 'Obrigatório' })
  const b = (body && typeof body === 'object' ? body : {}) as { quoteId?: unknown; walletConnectionId?: unknown; collector?: unknown }
  if (typeof b.quoteId !== 'string' || !b.quoteId || typeof b.walletConnectionId !== 'string' || !b.walletConnectionId) {
    return domainError(422, 'VALIDATION_ERROR', 'Pedido inválido', { quoteId: 'Obrigatório', walletConnectionId: 'Obrigatório' })
  }
  const requestHash = stableHash({ quoteId: b.quoteId, walletConnectionId: b.walletConnectionId, collector: b.collector ?? null })

  const existing = getDbRaw().orders.find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey)
  if (existing) {
    if (existing.requestHash !== requestHash) {
      return domainError(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada com um pedido diferente')
    }
    return { ok: true, order: existing, created: false }
  }

  const collector = validateCollector(b.collector)
  if (!collector.ok) return domainError(422, 'VALIDATION_ERROR', 'Corrija os dados do colecionador', collector.fields)

  const db = getDbRaw()
  const quote = db.quotes.find((q) => q.id === b.quoteId && q.userId === userId)
  if (!quote) return domainError(404, 'NOT_FOUND', 'Cotação não encontrada')
  if (mockNow().getTime() > new Date(quote.expiresAt).getTime()) {
    return domainError(410, 'QUOTE_EXPIRED', 'A cotação expirou. Atualize para continuar.')
  }
  const conn = db.walletConnections.find((c) => c.id === b.walletConnectionId && c.userId === userId)
  if (!conn || conn.disconnectedAt || mockNow().getTime() > new Date(conn.expiresAt).getTime()) {
    return domainError(409, 'WALLET_DISCONNECTED', 'A carteira está desconectada. Conecte novamente para continuar.')
  }
  if (conn.network !== quote.network) {
    return domainError(409, 'CONFLICT', 'A rede da carteira difere da rede da cotação', { network: 'Rede divergente' })
  }

  // Revalidação contra o estado ATUAL: qualquer mudança exige nova cotação e nova confirmação.
  const current = priceUserCart(userId, quote.network)
  if (!current.ok) {
    if (current.error.code === 'QUOTE_CHANGED' || current.error.code === 'AVAILABILITY_CONFLICT') return current
    return domainError(409, 'QUOTE_CHANGED', 'O carrinho mudou desde a cotação. Revise e confirme novamente.', undefined, { reason: 'cart' })
  }
  if (current.fingerprint !== quote.fingerprint) {
    return domainError(409, 'QUOTE_CHANGED', 'Preços, taxas, cupom ou quantidades mudaram desde a cotação. Revise e confirme novamente.', undefined, { reason: 'pricing' })
  }

  const now = mockNow()
  const order: DbOrder = {
    id: generateId('ord'),
    userId,
    idempotencyKey,
    requestHash,
    quoteId: quote.id,
    status: 'pending',
    network: quote.network,
    provider: conn.provider,
    walletAddress: conn.address,
    transactionHash: null,
    failureReason: null,
    lines: quote.lines.map((l) => ({ ...l })),
    couponCode: quote.couponCode,
    couponDiscountBp: quote.couponDiscountBp,
    totals: { ...quote.totals },
    collector: collector.collector,
    createdAt: now.toISOString(),
    settleAt: new Date(now.getTime() + SETTLE_DELAY_MS).toISOString(),
    outcome: opts.outcome,
    settledAt: null,
  }
  dbUpdate((d) => {
    d.orders.push(order)
  })
  nextVersion(`order:${order.id}`) // v1 = pedido pendente (sem evento); v2 = liquidação
  return { ok: true, order, created: true }
}

export function getOrder(userId: string, orderId: string): { ok: true; order: DbOrder } | Fail {
  const order = getDbRaw().orders.find((o) => o.id === orderId && o.userId === userId)
  if (!order) return domainError(404, 'NOT_FOUND', 'Pedido não encontrado', undefined, { orderId })
  return { ok: true, order }
}

export function listOrders(userId: string, status?: string | null): DbOrder[] {
  return getDbRaw().orders.filter((o) => o.userId === userId && (!status || o.status === status))
}

function settle(orderId: string): DbOrder | null {
  const order = getDbRaw().orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return null
  let status: OrderStatus = order.outcome
  let failureReason: string | null = null
  const touched = new Set<string>()

  if (status === 'refused') {
    failureReason = 'Pagamento recusado pela simulação (saldo insuficiente).'
  } else {
    const db = getDbRaw()
    const short = order.lines.some((l) => {
      const edition = findEdition(db.nfts.find((n) => n.id === l.nftId), l.editionId)
      return !edition || (edition.available !== null && edition.available < l.quantity)
    })
    if (short) {
      status = 'refused'
      failureReason = 'Edição esgotada durante a confirmação.'
    }
  }

  dbUpdate((d) => {
    const o = d.orders.find((x) => x.id === orderId)!
    o.status = status
    o.failureReason = failureReason
    o.settledAt = mockNow().toISOString()
    if (status === 'confirmed') {
      o.transactionHash = `0x${sha256Hex(`${o.id}:${o.userId}:${o.createdAt}`)}`
      for (const l of o.lines) {
        const nft = d.nfts.find((n) => n.id === l.nftId)
        const edition = nft?.editions.find((e) => e.id === l.editionId)
        if (edition && edition.available !== null) {
          edition.available -= l.quantity
          edition.isSoldOut = edition.available <= 0
          touched.add(l.nftId)
        }
      }
      // Remove do carrinho apenas os itens e as quantidades efetivamente comprados.
      const cart = d.carts.find((c) => c.userId === o.userId)
      if (cart) {
        for (const l of o.lines) {
          const line = cart.lines.find((x) => x.nftId === l.nftId && x.editionId === l.editionId)
          if (line) line.quantity -= l.quantity
        }
        cart.lines = cart.lines.filter((x) => x.quantity > 0)
        if (cart.lines.length === 0) {
          cart.couponCode = null
          cart.couponDiscountBp = 0
        }
        cart.version += 1
        cart.updatedAt = mockNow().toISOString()
      }
    }
  })

  for (const nftId of touched) {
    const nft = getDbRaw().nfts.find((n) => n.id === nftId)!
    publishEvent({
      type: 'nft.updated',
      resource: { type: 'nft', id: nftId },
      data: {
        nftId,
        priceEth: nft.priceEth,
        ...(nft.previousPriceEth ? { previousPriceEth: nft.previousPriceEth } : {}),
        editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available, isSoldOut: e.isSoldOut })),
      },
    })
  }
  const settled = getDbRaw().orders.find((o) => o.id === orderId)!
  publishEvent({
    type: 'order.updated',
    resource: { type: 'order', id: orderId },
    data: { orderId, userId: settled.userId, status: settled.status, transactionHash: settled.transactionHash, failureReason: settled.failureReason, settledAt: settled.settledAt },
  })
  return settled
}

/** Liquida os pedidos pendentes cujo prazo (relógio simulado) já venceu. */
export function settleDueOrders(): DbOrder[] {
  const now = mockNow().getTime()
  const due = getDbRaw().orders.filter((o) => o.status === 'pending' && new Date(o.settleAt).getTime() <= now)
  const settled: DbOrder[] = []
  for (const o of due) {
    const s = settle(o.id)
    if (s) settled.push(s)
  }
  return settled
}

/** Liquida imediatamente (controle de testes). */
export function settleOrderNow(orderId: string): DbOrder | null {
  return settle(orderId)
}
