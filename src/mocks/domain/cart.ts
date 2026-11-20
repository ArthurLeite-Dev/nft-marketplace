import type { DbCart, DbCartLine, Network } from '../db/types'
import { dbUpdate, generateId, getDbRaw, mockNow } from '../db/store'
import { DEFAULT_NETWORK, computeTotals, evaluateLine, findEdition, maxQuantityFor } from './pricing'
import { domainError, type DomainError } from './errors'

/**
 * Carrinho.
 *
 * Regra central: TODA operação (leitura, mutação, cotação, pedido) resolve o carrinho pelo mesmo
 * "dono": o usuário autenticado (carrinho do usuário) ou o visitante (carrinho identificado por
 * X-Cart-Id). A versão anterior misturava os dois, o que quebrava edição de quantidade, cupom e
 * cotação depois do login.
 */
export interface CartOwner {
  userId: string | null
  guestCartId: string | null
}

export type CartResult = { ok: true; cart: DbCart } | { ok: false; error: DomainError }

export interface CartLineView {
  lineId: string
  nftId: string
  editionId: string
  name: string
  editionLabel: string
  unitPriceEth: string
  previousUnitPriceEth?: string
  quantity: number
  maxQuantity: number
  status: 'available' | 'price-changed' | 'unavailable'
  statusReason?: string
  artwork: { url: string; alt: string; width?: number; height?: number }
}

export interface CartView {
  version: number
  lines: CartLineView[]
  couponCode: string | null
  couponDiscountBp: number
  network: Network | null
  totals: { subtotalEth: string; discountEth: string; networkFeeEth: string; totalEth: string }
}

const COUPONS: Record<string, { bp: number; expired: boolean }> = {
  JUNGLE10: { bp: 1000, expired: false },
  EARLY25: { bp: 2500, expired: true },
}

export function findCart(owner: CartOwner): DbCart | undefined {
  const db = getDbRaw()
  if (owner.userId) return db.carts.find((c) => c.userId === owner.userId)
  if (owner.guestCartId) return db.carts.find((c) => c.userId === null && c.guestCartId === owner.guestCartId)
  return undefined
}

function newCart(owner: CartOwner): DbCart {
  return {
    id: generateId('cart'),
    userId: owner.userId,
    guestCartId: owner.userId ? null : owner.guestCartId,
    version: 0,
    lines: [],
    couponCode: null,
    couponDiscountBp: 0,
    network: null,
    updatedAt: mockNow().toISOString(),
  }
}

function missingOwner(): { ok: false; error: DomainError } {
  return domainError(400, 'VALIDATION_ERROR', 'Identificador do carrinho ausente', { cart: 'Envie o cabeçalho X-Cart-Id' })
}

function hasOwner(owner: CartOwner): boolean {
  return Boolean(owner.userId || owner.guestCartId)
}

function touch(cart: DbCart): void {
  cart.version += 1
  cart.updatedAt = mockNow().toISOString()
}

export function buildCartView(cart: DbCart | undefined | null): CartView {
  if (!cart) {
    return {
      version: 0,
      lines: [],
      couponCode: null,
      couponDiscountBp: 0,
      network: null,
      totals: { subtotalEth: '0', discountEth: '0', networkFeeEth: '0', totalEth: '0' },
    }
  }
  const db = getDbRaw()
  const evaluated = cart.lines.map((line) => {
    const nft = db.nfts.find((n) => n.id === line.nftId)
    const edition = findEdition(nft, line.editionId)
    const ev = evaluateLine(line, nft)
    const view: CartLineView = {
      lineId: line.lineId,
      nftId: line.nftId,
      editionId: line.editionId,
      name: nft?.name ?? 'Item removido',
      editionLabel: edition?.label ?? '—',
      unitPriceEth: ev.unitPriceEth,
      quantity: line.quantity,
      maxQuantity: ev.maxQuantity,
      status: ev.status,
      artwork: nft ? { ...nft.artwork } : { url: '/images/nfts/nft1.png', alt: 'Item removido do catálogo' },
      ...(ev.previousUnitPriceEth ? { previousUnitPriceEth: ev.previousUnitPriceEth } : {}),
      ...(ev.statusReason ? { statusReason: ev.statusReason } : {}),
    }
    return { view, ev }
  })
  const network = cart.network
  const totals = computeTotals(
    evaluated.map(({ view, ev }) => ({ unitPriceEth: ev.unitPriceEth, quantity: view.quantity, billable: ev.billable })),
    cart.couponDiscountBp,
    network ?? DEFAULT_NETWORK,
  )
  return {
    version: cart.version,
    lines: evaluated.map((e) => e.view),
    couponCode: cart.couponCode,
    couponDiscountBp: cart.couponDiscountBp,
    network,
    totals,
  }
}

export function addItem(owner: CartOwner, input: { nftId: string; editionId: string; quantity: number }): CartResult {
  if (!hasOwner(owner)) return missingOwner()
  const db = getDbRaw()
  const nft = db.nfts.find((n) => n.id === input.nftId)
  if (!nft) return domainError(404, 'NOT_FOUND', 'NFT não encontrado', undefined, { nftId: input.nftId })
  const edition = findEdition(nft, input.editionId)
  if (!edition) return domainError(404, 'NOT_FOUND', 'Edição não encontrada', undefined, { editionId: input.editionId })
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return domainError(422, 'VALIDATION_ERROR', 'Quantidade inválida', { quantity: 'A quantidade deve ser um inteiro maior que zero' })
  }
  const max = maxQuantityFor(edition)
  if (max === 0) return domainError(409, 'AVAILABILITY_CONFLICT', 'Edição esgotada', undefined, { maxQuantity: 0 })
  const existing = findCart(owner)?.lines.find((l) => l.nftId === input.nftId && l.editionId === input.editionId)
  const total = (existing?.quantity ?? 0) + input.quantity
  if (total > max) {
    return domainError(409, 'AVAILABILITY_CONFLICT', `Máximo de ${max} unidade(s) por pedido para esta edição`, { quantity: `Máximo de ${max}` }, { maxQuantity: max, requested: total })
  }
  const { result } = dbUpdate((d) => {
    let cart = owner.userId
      ? d.carts.find((c) => c.userId === owner.userId)
      : d.carts.find((c) => c.userId === null && c.guestCartId === owner.guestCartId)
    if (!cart) {
      cart = newCart(owner)
      d.carts.push(cart)
    }
    const line = cart.lines.find((l) => l.nftId === input.nftId && l.editionId === input.editionId)
    if (line) {
      line.quantity += input.quantity
      line.seenPriceEth = edition.priceEth
    } else {
      cart.lines.push({ lineId: generateId('line'), nftId: input.nftId, editionId: input.editionId, quantity: input.quantity, seenPriceEth: edition.priceEth })
    }
    touch(cart)
    return cart
  })
  return { ok: true, cart: result }
}

function withLine(owner: CartOwner, lineId: string): { ok: true; cart: DbCart; line: DbCartLine } | { ok: false; error: DomainError } {
  if (!hasOwner(owner)) return missingOwner()
  const cart = findCart(owner)
  const line = cart?.lines.find((l) => l.lineId === lineId)
  if (!cart || !line) return domainError(404, 'NOT_FOUND', 'Item do carrinho não encontrado', undefined, { lineId })
  return { ok: true, cart, line }
}

export function changeQuantity(owner: CartOwner, lineId: string, quantity: number): CartResult {
  const found = withLine(owner, lineId)
  if (!found.ok) return found
  if (!Number.isInteger(quantity) || quantity < 1) {
    return domainError(422, 'VALIDATION_ERROR', 'Quantidade inválida', { quantity: 'A quantidade deve ser um inteiro maior que zero' })
  }
  const nft = getDbRaw().nfts.find((n) => n.id === found.line.nftId)
  const edition = findEdition(nft, found.line.editionId)
  const max = edition ? maxQuantityFor(edition) : 0
  if (quantity > max) {
    return domainError(409, 'AVAILABILITY_CONFLICT', max === 0 ? 'Edição esgotada' : `Máximo de ${max} unidade(s) por pedido para esta edição`, { quantity: `Máximo de ${max}` }, { maxQuantity: max, requested: quantity })
  }
  const { result } = dbUpdate((d) => {
    const cart = d.carts.find((c) => c.id === found.cart.id)!
    cart.lines.find((l) => l.lineId === lineId)!.quantity = quantity
    touch(cart)
    return cart
  })
  return { ok: true, cart: result }
}

/** O usuário confirma o novo preço de uma linha (price-changed -> available). */
export function acceptPrice(owner: CartOwner, lineId: string): CartResult {
  const found = withLine(owner, lineId)
  if (!found.ok) return found
  const nft = getDbRaw().nfts.find((n) => n.id === found.line.nftId)
  const edition = findEdition(nft, found.line.editionId)
  const { result } = dbUpdate((d) => {
    const cart = d.carts.find((c) => c.id === found.cart.id)!
    const line = cart.lines.find((l) => l.lineId === lineId)!
    if (edition) line.seenPriceEth = edition.priceEth
    touch(cart)
    return cart
  })
  return { ok: true, cart: result }
}

export function removeLine(owner: CartOwner, lineId: string): CartResult {
  const found = withLine(owner, lineId)
  if (!found.ok) return found
  const { result } = dbUpdate((d) => {
    const cart = d.carts.find((c) => c.id === found.cart.id)!
    cart.lines = cart.lines.filter((l) => l.lineId !== lineId)
    if (cart.lines.length === 0) {
      cart.couponCode = null
      cart.couponDiscountBp = 0
    }
    touch(cart)
    return cart
  })
  return { ok: true, cart: result }
}

export function applyCoupon(owner: CartOwner, rawCode: string, opts: { forceExpired?: boolean } = {}): CartResult {
  if (!hasOwner(owner)) return missingOwner()
  const code = rawCode.trim().toUpperCase()
  if (!code) return domainError(422, 'VALIDATION_ERROR', 'Informe o código do cupom', { code: 'Informe o código do cupom' })
  const cart = findCart(owner)
  if (!cart || cart.lines.length === 0) {
    return domainError(422, 'VALIDATION_ERROR', 'Adicione itens ao carrinho antes de aplicar um cupom', { code: 'Carrinho vazio' })
  }
  const coupon = COUPONS[code]
  if (!coupon) return domainError(422, 'COUPON_INVALID', 'Código de cupom inválido', { code: 'Cupom não encontrado' })
  if (coupon.expired || opts.forceExpired) return domainError(422, 'COUPON_EXPIRED', 'Este cupom expirou', { code: 'Cupom expirado' })
  const { result } = dbUpdate((d) => {
    const c = d.carts.find((x) => x.id === cart.id)!
    c.couponCode = code
    c.couponDiscountBp = coupon.bp
    touch(c)
    return c
  })
  return { ok: true, cart: result }
}

export function removeCoupon(owner: CartOwner): CartResult {
  if (!hasOwner(owner)) return missingOwner()
  const cart = findCart(owner)
  if (!cart) return { ok: true, cart: newCart(owner) }
  const { result } = dbUpdate((d) => {
    const c = d.carts.find((x) => x.id === cart.id)!
    c.couponCode = null
    c.couponDiscountBp = 0
    touch(c)
    return c
  })
  return { ok: true, cart: result }
}

export interface MergeAdjustment {
  nftId: string
  editionId: string
  originalQuantity: number
  adjustedQuantity: number
  reason: string
}

/** Move os itens do visitante para o carrinho do usuário ao autenticar. Idempotente. */
export function mergeGuestCart(guestCartId: string | null, userId: string): { cart: DbCart; adjustments: MergeAdjustment[] } {
  const adjustments: MergeAdjustment[] = []
  const { result } = dbUpdate((d) => {
    let user = d.carts.find((c) => c.userId === userId)
    if (!user) {
      user = newCart({ userId, guestCartId: null })
      d.carts.push(user)
    }
    const guest = guestCartId ? d.carts.find((c) => c.userId === null && c.guestCartId === guestCartId) : undefined
    if (!guest) return user
    for (const gl of guest.lines) {
      const nft = d.nfts.find((n) => n.id === gl.nftId)
      const edition = findEdition(nft, gl.editionId)
      const max = edition ? maxQuantityFor(edition) : 0
      const existing = user.lines.find((l) => l.nftId === gl.nftId && l.editionId === gl.editionId)
      const sum = (existing?.quantity ?? 0) + gl.quantity
      const merged = max > 0 ? Math.min(sum, max) : sum
      if (merged !== sum) {
        adjustments.push({ nftId: gl.nftId, editionId: gl.editionId, originalQuantity: sum, adjustedQuantity: merged, reason: `Limitado a ${max} unidade(s) por pedido` })
      }
      if (existing) existing.quantity = merged
      else user.lines.push({ lineId: generateId('line'), nftId: gl.nftId, editionId: gl.editionId, quantity: merged, ...(gl.seenPriceEth ? { seenPriceEth: gl.seenPriceEth } : {}) })
    }
    if (!user.couponCode && guest.couponCode) {
      user.couponCode = guest.couponCode
      user.couponDiscountBp = guest.couponDiscountBp
    }
    d.carts = d.carts.filter((c) => c.id !== guest.id)
    touch(user)
    return user
  })
  return { cart: result, adjustments }
}
