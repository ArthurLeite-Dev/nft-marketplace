import type { DbNft } from '../db/types'
import type { NftUpdatedEvent } from '../../api/contracts/events'
import { dbUpdate, getDbRaw } from '../db/store'
import { publishEvent } from '../events'

export interface NftUpdatePatch {
  /** Novo preço da edição padrão (atalho). */
  priceEth?: string
  /** Alterações por edição. `available: null` = edição aberta. */
  editions?: Record<string, { priceEth?: string; available?: number | null }>
}

/**
 * Altera preço/disponibilidade de um NFT no banco e publica `nft.updated`.
 * Os mesmos dados passam a ser servidos pelo REST, então REST e evento sempre concordam.
 */
export function applyNftUpdate(nftId: string, patch: NftUpdatePatch): { ok: true; event: NftUpdatedEvent } | { ok: false } {
  if (!getDbRaw().nfts.some((n) => n.id === nftId)) return { ok: false }

  dbUpdate((db) => {
    const nft = db.nfts.find((n) => n.id === nftId)!
    const edits: NonNullable<NftUpdatePatch['editions']> = { ...(patch.editions ?? {}) }
    if (patch.priceEth !== undefined) edits[nft.defaultEditionId] = { ...(edits[nft.defaultEditionId] ?? {}), priceEth: patch.priceEth }
    for (const [editionId, change] of Object.entries(edits)) {
      const edition = nft.editions.find((e) => e.id === editionId)
      if (!edition) continue
      if (change.priceEth !== undefined && change.priceEth !== edition.priceEth) {
        edition.previousPriceEth = edition.priceEth
        edition.priceEth = change.priceEth
      }
      if (change.available !== undefined) {
        edition.available = change.available
        edition.isSoldOut = change.available === 0
      }
    }
    const def = nft.editions.find((e) => e.id === nft.defaultEditionId)
    if (def && def.priceEth !== nft.priceEth) {
      nft.previousPriceEth = nft.priceEth
      nft.priceEth = def.priceEth
    }
  })

  const nft = getDbRaw().nfts.find((n) => n.id === nftId) as DbNft
  const event = publishEvent({
    type: 'nft.updated',
    resource: { type: 'nft', id: nftId },
    data: {
      nftId,
      priceEth: nft.priceEth,
      ...(nft.previousPriceEth ? { previousPriceEth: nft.previousPriceEth } : {}),
      editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available, isSoldOut: e.isSoldOut })),
    },
  }) as NftUpdatedEvent
  return { ok: true, event }
}
