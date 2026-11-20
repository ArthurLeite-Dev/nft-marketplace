import type { CartLineStatus, DbCartLine, DbCartTotals, DbEdition, DbNft, Network } from '../db/types'
import { addEth, compareEth, multiplyEth, percentOfEth, subtractEth } from '../../lib/eth'
import { stableHash } from '../db/store'

/** Taxa de rede fixa por rede, em ETH (string decimal). */
export const NETWORK_FEE_ETH: Record<Network, string> = {
  Ethereum: '0.012',
  Polygon: '0.003',
  Base: '0.001',
}

/** Teto de unidades por pedido, independente da edição. */
export const MAX_PER_ORDER = 8

export const DEFAULT_NETWORK: Network = 'Ethereum'

export interface LineEvaluation {
  status: CartLineStatus
  statusReason?: string
  unitPriceEth: string
  previousUnitPriceEth?: string
  maxQuantity: number
  /** Linha entra nos totais (indisponíveis ficam de fora). */
  billable: boolean
}

/** Unidades disponíveis: `null` = edição aberta (ilimitada). */
export function availableUnits(edition: DbEdition): number | null {
  if (edition.isSoldOut) return 0
  return edition.available
}

export function maxQuantityFor(edition: DbEdition): number {
  const avail = availableUnits(edition)
  const cap = Math.min(edition.maxPerOrder, MAX_PER_ORDER)
  return Math.max(0, avail === null ? cap : Math.min(cap, avail))
}

export function findEdition(nft: DbNft | undefined, editionId: string): DbEdition | undefined {
  return nft?.editions.find((e) => e.id === editionId)
}

export function evaluateLine(line: DbCartLine, nft: DbNft | undefined): LineEvaluation {
  const edition = findEdition(nft, line.editionId)
  if (!nft || !edition) {
    return {
      status: 'unavailable',
      statusReason: 'Item removido do catálogo',
      unitPriceEth: line.seenPriceEth ?? '0',
      maxQuantity: 0,
      billable: false,
    }
  }
  const avail = availableUnits(edition)
  const maxQuantity = maxQuantityFor(edition)
  if (avail !== null && avail < line.quantity) {
    return {
      status: 'unavailable',
      statusReason: avail === 0 ? 'Edição esgotada' : `Restam apenas ${avail} unidade(s) desta edição`,
      unitPriceEth: edition.priceEth,
      maxQuantity,
      billable: false,
    }
  }
  if (line.seenPriceEth && compareEth(edition.priceEth, line.seenPriceEth) !== 0) {
    return {
      status: 'price-changed',
      statusReason: `Preço alterado de ${line.seenPriceEth} ETH para ${edition.priceEth} ETH`,
      unitPriceEth: edition.priceEth,
      previousUnitPriceEth: line.seenPriceEth,
      maxQuantity,
      billable: true,
    }
  }
  return { status: 'available', unitPriceEth: edition.priceEth, maxQuantity, billable: true }
}

export interface PricedLine {
  unitPriceEth: string
  quantity: number
  billable: boolean
}

export function computeTotals(lines: PricedLine[], couponDiscountBp: number, network: Network): DbCartTotals {
  let subtotal = '0'
  let hasBillable = false
  for (const line of lines) {
    if (!line.billable) continue
    hasBillable = true
    subtotal = addEth(subtotal, multiplyEth(line.unitPriceEth, line.quantity))
  }
  const discount = percentOfEth(subtotal, couponDiscountBp)
  const fee = hasBillable ? NETWORK_FEE_ETH[network] : '0'
  const total = addEth(subtractEth(subtotal, discount), fee)
  return { subtotalEth: subtotal, discountEth: discount, networkFeeEth: fee, totalEth: total }
}

/** Assinatura do conteúdo precificado: muda se preço, quantidade, cupom, rede ou taxa mudarem. */
export function pricingFingerprint(
  lines: { nftId: string; editionId: string; unitPriceEth: string; quantity: number }[],
  couponCode: string | null,
  couponDiscountBp: number,
  network: Network,
  totals: DbCartTotals,
): string {
  return stableHash({
    lines: lines.map((l) => ({ n: l.nftId, e: l.editionId, p: l.unitPriceEth, q: l.quantity })),
    couponCode,
    couponDiscountBp,
    network,
    totals,
  })
}
