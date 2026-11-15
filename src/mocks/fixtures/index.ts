import type { DbSchema, DbCart, DbCartTotals, DbOrder } from '../db/types'
import { NFT_FIXTURES } from './nfts'
import { USER_FIXTURES } from './users'

function emptyTotals(): DbCartTotals {
  return { subtotalEth: '0', discountEth: '0', networkFeeEth: '0', totalEth: '0' }
}

export function createFixturesDb(): DbSchema {
  const users = [...USER_FIXTURES]
  const nfts = [...NFT_FIXTURES]

  const carts: DbCart[] = [
    {
      id: 'cart_guest_ana',
      userId: null,
      guestCartId: 'guest_ana',
      version: 1,
      lines: [
        { lineId: 'line_a1', nftId: 'nft_01', editionId: 'ed_01_2', quantity: 2, seenPriceEth: '1.50' },
        { lineId: 'line_a2', nftId: 'nft_03', editionId: 'ed_03_1', quantity: 1, seenPriceEth: '1.10' },
        { lineId: 'line_a3', nftId: 'nft_07', editionId: 'ed_07_2', quantity: 3, seenPriceEth: '0.50' },
      ],
      couponCode: null,
      couponDiscountBp: 0,
      network: 'Ethereum',
      totals: emptyTotals(),
      updatedAt: '2026-11-10T10:00:00.000Z',
    },
  ]

  const orders: DbOrder[] = []
  const sessions: DbSchema['sessions'] = []
  const scenarioMarks: DbSchema['scenarioMarks'] = []
  const clock = { offsetMs: 0 }

  return { version: 1, users, nfts, carts, orders, sessions, scenarioMarks, clock }
}
