import type { DbSchema } from '../db/types'
import { NFT_FIXTURES } from './nfts'
import { USER_FIXTURES } from './users'

/**
 * Cenário conhecido e determinístico: 2 usuários (Ana, com carteiras e favoritos; Bruno, sem carrinho),
 * 36 NFTs e nenhum carrinho/pedido. `resetDb()` restaura exatamente este estado.
 */
export function createFixturesDb(): DbSchema {
  return {
    version: 2,
    seq: 0,
    users: JSON.parse(JSON.stringify(USER_FIXTURES)),
    nfts: JSON.parse(JSON.stringify(NFT_FIXTURES)),
    carts: [],
    orders: [],
    quotes: [],
    walletConnections: [],
    sessions: [],
    scenarioMarks: [],
    clock: { offsetMs: 0 },
    versions: {},
  }
}
