import type {
  DbCart,
  DbCartLine,
  DbCartTotals,
  DbEdition,
  DbNft,
  Network,
} from '../db/types'
import { dbUpdate, getDbRaw, generateId } from '../db/store'
import { compareEth, multiplyEth, percentOfEth, subtractEth, addEth } from '../../lib/eth'
import { NETWORK_FEE_ETH, MAX_PER_ORDER } from '../fixtures/users'

export interface CartLineView {
  lineId: string
  nftId: string
  editionId: string
  name: string
  editionLabel: string
  unitPriceEth: string
  quantity: number
  maxQuantity: number
  status: 'available' | 'price-changed' | 'unavailable'
  seenPriceEth?: string
  artworkUrl: string
  artworkAlt: string
  subtotalEth: string
  blocked: boolean
}

export interface CartView {
  id: string
  version: number
  lines: CartLineView[]
  couponCode: string | null
  couponDiscountBp: number
  network: Network | null
  totals: DbCartTotals
  updatedAt: string
  hasBlockedLine: boolean
  hasUnavailableLine: boolean
}

export interface AddItemInput {
  nftId: string
  editionId: string
  quantity: number
  guestCartId: string | null
}

export interface ChangeQuantityInput {
  lineId: string
  quantity: number
}

export interface CartError {
  code: 'AVAILABILITY_CONFLICT' | 'COUPON_INVALID' | 'COUPON_EXPIRED' | 'VALIDATION_ERROR' | 'NOT_FOUND'
  message: string
  fields?: Record<string, string>
  details?: Record<string, unknown>
  status: number
}

export function getCartForGuest(guestCartId: string | null): DbCart | undefined {
  if (!guestCartId) return undefined
  return getDbRaw().carts.find((c) => c.guestCartId === guestCartId)
}

export function getOrCreateCart({
  userId,
  guestCartId,
  network,
}: {
  userId: string | null
  guestCartId: string | null
  network: Network | null
}): DbCart {
  const existing = getDbRaw().carts.find(
    (c) => (userId ? c.userId === userId : c.guestCartId === guestCartId),
  )
  if (existing) return existing

  const id = generateId('cart')
  const now = new Date().toISOString()
  const emptyTotals: DbCartTotals = { subtotalEth: '0', discountEth: '0', networkFeeEth: '0', totalEth: '0' }

  dbUpdate((db) => {
    db.carts.push({
      id,
      userId,
      guestCartId: guestCartId ?? null,
      version: 1,
      lines: [],
      couponCode: null,
      couponDiscountBp: 0,
      network,
      totals: emptyTotals,
      updatedAt: now,
    })
    return undefined
  })

  return getDbRaw().carts.find((c) => c.id === id)!
}

function editionLookup(nfts: DbNft[]): Map<string, { edition: DbEdition; nft: DbNft }> {
  const map = new Map<string, { edition: DbEdition; nft: DbNft }>()
  for (const nft of nfts) {
    for (const edition of nft.editions) {
      map.set(`${nft.id}:${edition.id}`, { edition, nft })
    }
  }
  return map
}

export function recomputeTotals(
  lines: DbCartLine[],
  nfts: DbNft[],
  couponDiscountBp: number,
  network: Network | null,
): DbCartTotals {
  const lookup = editionLookup(nfts)
  const WEI_PER_ETH = 10n ** 18n
  let subtotalWei = 0n
  let hasBillable = false

  for (const line of lines) {
    const entry = lookup.get(`${line.nftId}:${line.editionId}`)
    if (!entry) continue
    const { edition } = entry
    const available = edition.available ?? 0
    if (available <= 0) continue
    hasBillable = true
    const [whole = '0', fraction = ''] = edition.priceEth.trim().split('.')
    const padded = fraction.padEnd(18, '0').slice(0, 18)
    const unitWei = BigInt(whole) * WEI_PER_ETH + BigInt(padded)
    subtotalWei += unitWei * BigInt(line.quantity)
  }

  const formatWei = (wei: bigint): string => {
    if (wei < 0n) return '0'
    const whole = wei / WEI_PER_ETH
    const remainder = wei % WEI_PER_ETH
    if (remainder === 0n) return whole.toString()
    const fractionString = remainder.toString().padStart(18, '0').replace(/0+$/, '')
    return `${whole}.${fractionString}`
  }

  const subtotalEth = formatWei(subtotalWei)
  const discountEth = percentOfEth(subtotalEth, couponDiscountBp)
  const networkFeeEth = hasBillable && network ? NETWORK_FEE_ETH[network] : '0'
  const totalEth = subtractEth(addEth(subtotalEth, networkFeeEth), discountEth)

  return { subtotalEth, discountEth, networkFeeEth, totalEth }
}

export function buildCartView(cart: DbCart, nfts: DbNft[]): CartView {
  const lookup = editionLookup(nfts)
  const lines: CartLineView[] = []
  let hasBlocked = false
  let hasUnavailable = false

  for (const line of cart.lines) {
    const entry = lookup.get(`${line.nftId}:${line.editionId}`)
    if (!entry) continue
    const { edition, nft } = entry
    const available = edition.available ?? 0
    const maxQty = Math.min(available <= 0 ? 0 : available, edition.maxPerOrder, MAX_PER_ORDER)
    const isSoldOut = maxQty === 0
    const isPriceChanged =
      line.seenPriceEth !== undefined && compareEth(line.seenPriceEth, edition.priceEth) !== 0

    let status: 'available' | 'price-changed' | 'unavailable' = 'available'
    if (isSoldOut) status = 'unavailable'
    else if (isPriceChanged) status = 'price-changed'

    if (status === 'unavailable') hasUnavailable = true
    if (status !== 'available') hasBlocked = true

    lines.push({
      lineId: line.lineId,
      nftId: line.nftId,
      editionId: line.editionId,
      name: nft.name,
      editionLabel: edition.label,
      unitPriceEth: edition.priceEth,
      quantity: line.quantity,
      maxQuantity: maxQty,
      status,
      seenPriceEth: line.seenPriceEth,
      artworkUrl: nft.artwork.url,
      artworkAlt: nft.artwork.alt,
      subtotalEth: multiplyEth(edition.priceEth, line.quantity),
      blocked: status !== 'available',
    })
  }

  return {
    id: cart.id,
    version: cart.version,
    lines,
    couponCode: cart.couponCode,
    couponDiscountBp: cart.couponDiscountBp,
    network: cart.network,
    totals: cart.totals,
    updatedAt: cart.updatedAt,
    hasBlockedLine: hasBlocked,
    hasUnavailableLine: hasUnavailable,
  }
}

export function addOrUpdateItem(input: AddItemInput): { ok: true; cart: DbCart } | { ok: false; error: CartError } {
  const db = getDbRaw()
  const nft = db.nfts.find((n) => n.id === input.nftId)
  if (!nft) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'NFT não encontrado', status: 404 } }
  }
  const edition = nft.editions.find((e) => e.id === input.editionId)
  if (!edition) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Edição não encontrada', status: 404 } }
  }

  const maxQty = Math.min(edition.available ?? 0, edition.maxPerOrder, MAX_PER_ORDER)
  if (maxQty <= 0) {
    return {
      ok: false,
      error: { code: 'AVAILABILITY_CONFLICT', message: 'Edição esgotada', details: { available: 0 }, status: 409 },
    }
  }
  if (input.quantity < 1 || input.quantity > maxQty) {
    return {
      ok: false,
      error: {
        code: 'AVAILABILITY_CONFLICT',
        message: `Quantidade excede o limite de ${maxQty} para esta edição`,
        details: { available: edition.available, maxPerOrder: edition.maxPerOrder },
        status: 409,
      },
    }
  }

  const cart = getOrCreateCart({ userId: null, guestCartId: input.guestCartId, network: null })
  const existingLine = cart.lines.find((l) => l.nftId === input.nftId && l.editionId === input.editionId)
  const newQuantity = (existingLine?.quantity ?? 0) + input.quantity
  if (newQuantity > maxQty) {
    return {
      ok: false,
      error: {
        code: 'AVAILABILITY_CONFLICT',
        message: `Quantidade total excede o limite de ${maxQty} para esta edição`,
        details: { available: edition.available, maxPerOrder: edition.maxPerOrder, current: existingLine?.quantity ?? 0 },
        status: 409,
      },
    }
  }

  dbUpdate((d) => {
    const c = d.carts.find((x) => x.id === cart.id)!
    if (existingLine) {
      existingLine.quantity = newQuantity
      existingLine.seenPriceEth = edition.priceEth
    } else {
      c.lines.push({ lineId: generateId('line'), nftId: input.nftId, editionId: input.editionId, quantity: input.quantity, seenPriceEth: edition.priceEth })
    }
    c.version += 1
    c.updatedAt = new Date().toISOString()
    return undefined
  })

  return { ok: true, cart: getDbRaw().carts.find((c) => c.id === cart.id)! }
}

export function changeQuantity(input: ChangeQuantityInput, guestCartId: string | null): { ok: true; cart: DbCart } | { ok: false; error: CartError } {
  const cart = getOrCreateCart({ userId: null, guestCartId, network: null })
  const line = cart.lines.find((l) => l.lineId === input.lineId)
  if (!line) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Linha não encontrada no carrinho', status: 404 } }
  }
  const entry = editionLookup(getDbRaw().nfts).get(`${line.nftId}:${line.editionId}`)
  if (!entry) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Edição não encontrada', status: 404 } }
  }
  const { edition } = entry
  const maxQty = Math.min(edition.available ?? 0, edition.maxPerOrder, MAX_PER_ORDER)
  if (input.quantity < 1) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Quantidade deve ser pelo menos 1', status: 422 } }
  }
  if (input.quantity > maxQty) {
    return {
      ok: false,
      error: {
        code: 'AVAILABILITY_CONFLICT',
        message: `Quantidade excede o limite de ${maxQty} para esta edição`,
        details: { available: edition.available, maxPerOrder: edition.maxPerOrder },
        status: 409,
      },
    }
  }

  dbUpdate((d) => {
    const c = d.carts.find((x) => x.id === cart.id)!
    line.quantity = input.quantity
    line.seenPriceEth = edition.priceEth
    c.version += 1
    c.updatedAt = new Date().toISOString()
    return undefined
  })

  return { ok: true, cart: getDbRaw().carts.find((c) => c.id === cart.id)! }
}

export function removeLine(lineId: string, guestCartId: string | null): { ok: true; cart: DbCart } | { ok: false; error: CartError } {
  const cart = getOrCreateCart({ userId: null, guestCartId, network: null })
  const idx = cart.lines.findIndex((l) => l.lineId === lineId)
  if (idx === -1) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Linha não encontrada no carrinho', status: 404 } }
  }

  dbUpdate((d) => {
    const c = d.carts.find((x) => x.id === cart.id)!
    c.lines.splice(idx, 1)
    c.version += 1
    c.updatedAt = new Date().toISOString()
    return undefined
  })

  return { ok: true, cart: getDbRaw().carts.find((c) => c.id === cart.id)! }
}

export function applyCoupon(code: string, guestCartId: string | null): { ok: true; cart: DbCart } | { ok: false; error: CartError } {
  const normalized = code.trim().toUpperCase()

  // Cupom válido
  if (normalized === 'JUNGLE10') {
    dbUpdate((d) => {
      const c = d.carts.find((x) => x.guestCartId === guestCartId)!
      c.couponCode = 'JUNGLE10'
      c.couponDiscountBp = 1000
      c.version += 1
      c.updatedAt = new Date().toISOString()
      return undefined
    })
    return { ok: true, cart: getDbRaw().carts.find((c) => c.guestCartId === guestCartId)! }
  }

  // Cupom existente mas expirado
  if (normalized === 'EARLY25') {
    return { ok: false, error: { code: 'COUPON_EXPIRED', message: 'Este cupom expirou', fields: { code: 'Código expirado' }, status: 422 } }
  }

  // Cupom desconhecido
  return { ok: false, error: { code: 'COUPON_INVALID', message: 'Código de cupom inválido', fields: { code: 'Cupom não encontrado' }, status: 422 } }
}

export function removeCoupon(guestCartId: string | null): { ok: true; cart: DbCart } {
  dbUpdate((d) => {
    const c = d.carts.find((x) => x.guestCartId === guestCartId)!
    c.couponCode = null
    c.couponDiscountBp = 0
    c.version += 1
    c.updatedAt = new Date().toISOString()
    return undefined
  })
  return { ok: true, cart: getDbRaw().carts.find((c) => c.guestCartId === guestCartId)! }
}

export function setCartNetwork(guestCartId: string | null, network: Network | null): DbCart {
  dbUpdate((d) => {
    const c = d.carts.find((x) => x.guestCartId === guestCartId)!
    c.network = network
    c.version += 1
    c.updatedAt = new Date().toISOString()
    return undefined
  })
  return getDbRaw().carts.find((c) => c.guestCartId === guestCartId)!
}

export function mergeGuestCart(guestCartId: string | null, userId: string): { ok: true; cart: DbCart; adjustments: string[] } | { ok: false; error: CartError } {
  const guestCart = guestCartId ? getCartForGuest(guestCartId) : undefined
  if (!guestCart || guestCart.lines.length === 0) {
    const userCart = getOrCreateCart({ userId, guestCartId: null, network: null })
    return { ok: true, cart: userCart, adjustments: [] }
  }

  const userCart = getOrCreateCart({ userId, guestCartId: null, network: guestCart.network })
  const adjustments: string[] = []
  const nfts = getDbRaw().nfts
  const lookup = editionLookup(nfts)

  const mergedLines: DbCartLine[] = [...userCart.lines]
  for (const guestLine of guestCart.lines) {
    const entry = lookup.get(`${guestLine.nftId}:${guestLine.editionId}`)
    const edition = entry ? entry.edition : null
    const maxQty = edition ? Math.min(edition.available ?? 0, edition.maxPerOrder, MAX_PER_ORDER) : 0
    const existing = mergedLines.find((l) => l.nftId === guestLine.nftId && l.editionId === guestLine.editionId)
    let addQty = guestLine.quantity
    if (existing) addQty += existing.quantity
    if (addQty > maxQty) {
      adjustments.push(`${entry?.nft.name ?? guestLine.nftId}: limitado a ${maxQty}`)
      addQty = maxQty
    }
    if (addQty < 1) continue
    if (existing) {
      existing.quantity = addQty
      existing.seenPriceEth = edition?.priceEth ?? guestLine.seenPriceEth
    } else {
      mergedLines.push({ lineId: generateId('line'), nftId: guestLine.nftId, editionId: guestLine.editionId, quantity: addQty, seenPriceEth: edition?.priceEth ?? guestLine.seenPriceEth })
    }
  }

  dbUpdate((d) => {
    const c = d.carts.find((x) => x.id === userCart.id)!
    c.lines = mergedLines
    c.version += 1
    c.updatedAt = new Date().toISOString()
    return undefined
  })

  // Remove guest cart
  dbUpdate((d) => {
    d.carts = d.carts.filter((x) => x.id !== guestCart.id)
    return undefined
  })

  return { ok: true, cart: getDbRaw().carts.find((c) => c.id === userCart.id)!, adjustments }
}
