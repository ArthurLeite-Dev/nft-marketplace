import type { DbOrder, DbOrderLine, Network, OrderStatus } from '../db/types'
import { dbUpdate, getDbRaw, generateId, mockNow } from '../db/store'
import { getCartForGuest, recomputeTotals, buildCartView } from './cart'

export interface QuoteInput {
  guestCartId: string | null
  userId: string | null
  network: Network
}

export interface QuoteOutput {
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  couponDiscountBp: number
  lines: Array<{
    lineId: string
    nftId: string
    editionId: string
    name: string
    editionLabel: string
    unitPriceEth: string
    quantity: number
    subtotalEth: string
    status: 'available' | 'price-changed' | 'unavailable'
  }>
  expiresAt: string
}

export function createQuote(input: QuoteInput): { ok: true; quote: QuoteOutput } | { ok: false; error: { code: string; message: string; fields?: Record<string, string>; details?: Record<string, unknown>; status: number } } {
  const cart = getCartForGuest(input.guestCartId)
  if (!cart || cart.lines.length === 0) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Carrinho vazio', fields: {}, status: 400 } }
  }

  const db = getDbRaw()
  const nfts = db.nfts
  const view = buildCartView(cart, nfts)

  for (const line of view.lines) {
    if (line.status === 'unavailable') {
      return {
        ok: false,
        error: {
          code: 'AVAILABILITY_CONFLICT',
          message: `Indisponível: ${line.name} (${line.editionLabel})`,
          fields: { edition: line.editionId },
          details: { nftId: line.nftId, editionId: line.editionId },
          status: 409,
        },
      }
    }
  }

  const totals = recomputeTotals(cart.lines, nfts, cart.couponDiscountBp, input.network)
  const expiresAt = new Date(mockNow().getTime() + 2 * 60 * 1000).toISOString()

  return {
    ok: true,
    quote: {
      subtotalEth: totals.subtotalEth,
      discountEth: totals.discountEth,
      networkFeeEth: totals.networkFeeEth,
      totalEth: totals.totalEth,
      couponCode: cart.couponCode,
      couponDiscountBp: cart.couponDiscountBp,
      lines: view.lines.map((l) => ({
        lineId: l.lineId,
        nftId: l.nftId,
        editionId: l.editionId,
        name: l.name,
        editionLabel: l.editionLabel,
        unitPriceEth: l.unitPriceEth,
        quantity: l.quantity,
        subtotalEth: l.subtotalEth,
        status: l.status,
      })),
      expiresAt,
    },
  }
}

export interface SameQuoteResult {
  changed: boolean
  previous?: QuoteOutput
  current?: QuoteOutput
}

export function compareQuotes(previous: QuoteOutput, current: QuoteOutput): boolean {
  if (previous.totalEth !== current.totalEth) return false
  if (previous.subtotalEth !== current.subtotalEth) return false
  if (previous.discountEth !== current.discountEth) return false
  if (previous.networkFeeEth !== current.networkFeeEth) return false
  if (previous.couponCode !== current.couponCode) return false
  if (previous.lines.length !== current.lines.length) return false
  for (let i = 0; i < previous.lines.length; i++) {
    const a = previous.lines[i]!
    const b = current.lines[i]!
    if (a.lineId !== b.lineId) return false
    if (a.unitPriceEth !== b.unitPriceEth) return false
    if (a.quantity !== b.quantity) return false
    if (a.status !== b.status) return false
  }
  return true
}

export interface PlaceOrderInput {
  idempotencyKey: string | null
  userId: string
  guestCartId: string | null
  network: Network
  provider: string
  walletAddress: string
  quote: QuoteOutput
  scenarioOutcome: OrderStatus
}

export function placeOrder(input: PlaceOrderInput): { ok: true; order: DbOrder; created: boolean } | { ok: false; error: { code: string; message: string; fields?: Record<string, string>; details?: Record<string, unknown>; status: number } } {
  if (!input.idempotencyKey) {
    return { ok: false, error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Chave de idempotência obrigatória', status: 400 } }
  }

  const db = getDbRaw()
  const user = db.users.find((u) => u.id === input.userId)
  if (!user) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado', status: 404 } }
  }

  const requestHash = stableHashOrderRequest(input)

  const existing = db.orders.find((o) => o.idempotencyKey === input.idempotencyKey && o.userId === input.userId)
  if (existing) {
    if (existing.requestHash === requestHash) {
      return { ok: true, order: existing, created: false }
    }
    return { ok: false, error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Chave de idempotência reutilizada com corpo diferente', status: 409 } }
  }

  // Revalidar cotação contra o carrinho atual
  const cart = getCartForGuest(input.guestCartId)
  if (!cart || cart.lines.length === 0) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Carrinho vazio', status: 400 } }
  }
  const nfts = db.nfts
  const view = buildCartView(cart, nfts)
  for (const line of view.lines) {
    if (line.status === 'unavailable') {
      return {
        ok: false,
        error: {
          code: 'AVAILABILITY_CONFLICT',
          message: `Indisponível: ${line.name} (${line.editionLabel})`,
          fields: { edition: line.editionId },
          details: { nftId: line.nftId, editionId: line.editionId },
          status: 409,
        },
      }
    }
  }

  const now = mockNow()
  const orderId = generateId('ord')
  const transactionHash = `0x${Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`

  const orderLines: DbOrderLine[] = view.lines.map((l) => ({
    lineId: l.lineId,
    nftId: l.nftId,
    editionId: l.editionId,
    name: l.name,
    editionLabel: l.editionLabel,
    unitPriceEth: l.unitPriceEth,
    quantity: l.quantity,
    subtotalEth: l.subtotalEth,
  }))

  const order: DbOrder = {
    id: orderId,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    requestHash,
    status: input.scenarioOutcome,
    network: input.network,
    provider: input.provider,
    walletAddress: input.walletAddress,
    transactionHash,
    failureReason: input.scenarioOutcome === 'refused' ? 'Pagamento recusado pela simulação' : null,
    lines: orderLines,
    couponCode: input.quote.couponCode,
    couponDiscountBp: input.quote.couponDiscountBp,
    totals: {
      subtotalEth: input.quote.subtotalEth,
      discountEth: input.quote.discountEth,
      networkFeeEth: input.quote.networkFeeEth,
      totalEth: input.quote.totalEth,
    },
    createdAt: now.toISOString(),
    settledAt: null,
  }

  dbUpdate((d) => {
    d.orders.push(order)
    return undefined
  })

  // Agendar liquidação em 3 s (relógio do mock) via controle de cenário é tratado pelo handler;
  // aqui apenas registramos o pedido pendente.
  return { ok: true, order, created: true }
}

export function settleOrder(orderId: string): { ok: true; order: DbOrder } | { ok: false; error: { code: string; message: string; status: number } } {
  const db = getDbRaw()
  const order = db.orders.find((o) => o.id === orderId)
  if (!order) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Pedido não encontrado', status: 404 } }
  }
  if (order.status !== 'pending') {
    return { ok: true, order }
  }

  const nfts = db.nfts
  dbUpdate((d) => {
    const o = d.orders.find((x) => x.id === orderId)!
    if (o.status === 'confirmed') {
      // Baixa estoque de edições limitadas
      for (const line of o.lines) {
        const nft = nfts.find((n) => n.id === line.nftId)
        const edition = nft?.editions.find((e) => e.id === line.editionId)
        if (edition && edition.available != null && edition.available > 0) {
          edition.available = Math.max(0, edition.available - line.quantity)
          edition.isSoldOut = edition.available === 0
        }
      }
      // Remove do carrinho do usuário só as quantidades compradas
      const userCart = d.carts.find((c) => c.userId === o.userId)
      if (userCart) {
        for (const line of o.lines) {
          const existing = userCart.lines.find((l) => l.nftId === line.nftId && l.editionId === line.editionId)
          if (existing) {
            existing.quantity -= line.quantity
            if (existing.quantity <= 0) {
              const idx = userCart.lines.indexOf(existing)
              userCart.lines.splice(idx, 1)
            } else {
              existing.seenPriceEth = line.unitPriceEth
            }
          }
        }
        userCart.version += 1
        userCart.updatedAt = new Date().toISOString()
      }
      o.couponCode = null
      o.couponDiscountBp = 0
    }
    o.settledAt = new Date().toISOString()
    return undefined
  })

  return { ok: true, order: getDbRaw().orders.find((o) => o.id === orderId)! }
}

export function getOrder(orderId: string, userId: string): { ok: true; order: DbOrder } | { ok: false; error: { code: string; message: string; status: number } } {
  const db = getDbRaw()
  const order = db.orders.find((o) => o.id === orderId)
  if (!order) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Pedido não encontrado', status: 404 } }
  }
  if (order.userId !== userId) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Pedido não encontrado', status: 404 } }
  }
  return { ok: true, order }
}

export function getPendingOrderForUser(userId: string): DbOrder | undefined {
  const db = getDbRaw()
  return db.orders.find((o) => o.userId === userId && o.status === 'pending')
}

function stableHashOrderRequest(input: PlaceOrderInput): string {
  const body = {
    userId: input.userId,
    network: input.network,
    provider: input.provider,
    walletAddress: input.walletAddress,
    lines: input.quote.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity })),
    couponCode: input.quote.couponCode,
    totals: input.quote,
  }
  return JSON.stringify(body, Object.keys(body).sort())
}
