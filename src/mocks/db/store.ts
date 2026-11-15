import type { DbSchema, DbDiff } from './types'

const STORAGE_KEY = 'jungle-mock-db:v1'

let memoryDb: DbSchema | null = null

function isPageContext(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`
}

function stableHash(value: unknown): string {
  const json = JSON.stringify(value, Object.keys(value as object).sort())
  let hash = 0
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

function readDb(): DbSchema {
  if (isPageContext()) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('Banco simulado não inicializado')
    return JSON.parse(raw) as DbSchema
  }
  if (!memoryDb) throw new Error('Banco simulado não inicializado')
  return deepClone(memoryDb)
}

function writeDb(next: DbSchema): void {
  if (isPageContext()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } else {
    memoryDb = deepClone(next)
  }
}

export function getDb(): DbSchema {
  return deepClone(readDb())
}

export function getDbRaw(): DbSchema {
  return readDb()
}

export function setDb(next: DbSchema): void {
  writeDb(next)
  if (isPageContext()) memoryDb = null
  else memoryDb = deepClone(next)
}

function diffDb(before: DbSchema, after: DbSchema): DbDiff {
  const nftById = (nfts: DbSchema['nfts']) => new Map(nfts.map((n) => [n.id, n]))
  const orderById = (orders: DbSchema['orders']) => new Map(orders.map((o) => [o.id, o]))

  const beforeNfts = nftById(before.nfts)
  const afterNfts = nftById(after.nfts)
  const nftAdded: DbSchema['nfts'] = []
  const nftUpdated: DbSchema['nfts'] = []
  const nftRemoved: DbSchema['nfts'] = []
  for (const [id, nft] of afterNfts) {
    if (!beforeNfts.has(id)) nftAdded.push(nft)
    else if (JSON.stringify(beforeNfts.get(id)) !== JSON.stringify(nft)) nftUpdated.push(nft)
  }
  for (const id of beforeNfts.keys()) if (!afterNfts.has(id)) nftRemoved.push(beforeNfts.get(id)!)

  const beforeOrders = orderById(before.orders)
  const afterOrders = orderById(after.orders)
  const orderUpdated: DbSchema['orders'] = []
  for (const [id, order] of afterOrders) {
    if (!beforeOrders.has(id)) continue
    if (JSON.stringify(beforeOrders.get(id)) !== JSON.stringify(order)) orderUpdated.push(order)
  }

  const cartUpdated: DbSchema['carts'] = []
  const beforeCartMap = new Map(before.carts.map((c) => [c.id, c]))
  for (const cart of after.carts) {
    const prev = beforeCartMap.get(cart.id)
    if (!prev || JSON.stringify(prev) !== JSON.stringify(cart)) cartUpdated.push(cart)
  }

  return { nfts: { added: nftAdded, updated: nftUpdated, removed: nftRemoved }, orders: { added: [], updated: orderUpdated, removed: [] }, carts: { updated: cartUpdated } }
}

export type DbUpdater<Result = void> = (db: DbSchema) => Result

export function dbUpdate<Result>(updater: DbUpdater<Result>): { result: Result; diff: DbDiff } {
  const before = readDb()
  const result = updater(before)
  const after = readDb()
  writeDb(after)
  return { result, diff: diffDb(before, after) }
}

export function resetDb(): void {
  const fresh = createFreshDb()
  writeDb(fresh)
  memoryDb = isPageContext() ? null : deepClone(fresh)
}

export function loadFixtures(fixtures: DbSchema): void {
  writeDb(fixtures)
  if (!isPageContext()) memoryDb = deepClone(fixtures)
}

export function ensureDbInitialized(): DbSchema {
  if (isPageContext()) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const fresh = createFreshDb()
      writeDb(fresh)
    }
    return getDb()
  }
  if (!memoryDb) {
    const fresh = createFreshDb()
    memoryDb = fresh
  }
  return deepClone(memoryDb)
}

function createFreshDb(): DbSchema {
  return {
    version: 1,
    users: [],
    nfts: [],
    carts: [],
    orders: [],
    sessions: [],
    scenarioMarks: [],
    clock: { offsetMs: 0 },
  }
}

export function markScenarioActivated(scenarioId: string): void {
  dbUpdate((d) => {
    const now = new Date().toISOString()
    d.scenarioMarks = d.scenarioMarks.filter((m) => m.scenarioId === scenarioId)
    d.scenarioMarks.push({ scenarioId: scenarioId as any, activatedAt: now })
    return undefined
  })
}

export function getScenarioMark(scenarioId: string): string | null {
  const d = readDb()
  const mark = d.scenarioMarks.find((m) => m.scenarioId === scenarioId)
  return mark ? mark.activatedAt : null
}

export function clearScenarioMarks(): void {
  dbUpdate((d) => {
    d.scenarioMarks = []
    return undefined
  })
}

export function advanceClock(ms: number): void {
  dbUpdate((d) => {
    d.clock.offsetMs += ms
    return undefined
  })
}

export function setClockOffset(ms: number): void {
  dbUpdate((d) => {
    d.clock.offsetMs = ms
    return undefined
  })
}

export function mockNow(): Date {
  const d = readDb()
  return new Date(Date.now() + d.clock.offsetMs)
}

export { generateId, stableHash }
