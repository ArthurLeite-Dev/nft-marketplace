import type { DbSchema } from './types'
import { SCHEMA_VERSION } from './types'
import { sha256Hex, stableStringify } from '../lib/sha256'

/**
 * Banco simulado.
 *
 * Fonte única da verdade em memória (`cache`) com escrita imediata no localStorage
 * (quando existir). Isso corrige dois defeitos da versão anterior:
 *  1. `dbUpdate` relia o localStorage depois de aplicar a mutação e gravava o dado antigo,
 *     descartando toda escrita feita no contexto da página (onde o MSW executa os handlers);
 *  2. as fixtures eram recarregadas a cada carregamento da página, apagando sessão e carrinho no refresh.
 *
 * Reset determinístico: `resetDb()` restaura exatamente o cenário conhecido das fixtures.
 */
export const STORAGE_KEY = 'jungle-mock-db:v2'

let cache: DbSchema | null = null
let fixturesFactory: (() => DbSchema) | null = null

function storage(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage
    return ls ?? null
  } catch {
    return null
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function persist(): void {
  const s = storage()
  if (!s || !cache) return
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Cota excedida ou storage indisponível: o banco continua válido em memória.
  }
}

function loadPersisted(): DbSchema | null {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbSchema
    return parsed && parsed.version === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

/** Registra a fábrica das fixtures (chamada por browser.ts e pelos testes). */
export function registerFixtures(factory: () => DbSchema): void {
  fixturesFactory = factory
}

/** Descarta o cache em memória (os testes usam isto para simular um "refresh" mantendo o localStorage). */
export function dropMemoryCache(): void {
  cache = null
}

export function getDbRaw(): DbSchema {
  if (cache) return cache
  const persisted = loadPersisted()
  if (persisted) {
    cache = persisted
    return cache
  }
  if (!fixturesFactory) throw new Error('Banco simulado não inicializado')
  cache = fixturesFactory()
  persist()
  return cache
}

export function getDb(): DbSchema {
  return clone(getDbRaw())
}

export function setDb(next: DbSchema): void {
  cache = clone(next)
  persist()
}

export type DbUpdater<Result = void> = (db: DbSchema) => Result

/** Aplica a mutação no banco, grava e devolve o resultado. Em caso de exceção, desfaz tudo. */
export function dbUpdate<Result>(updater: DbUpdater<Result>): { result: Result } {
  const db = getDbRaw()
  const snapshot = JSON.stringify(db)
  try {
    const result = updater(db)
    persist()
    return { result }
  } catch (error) {
    cache = JSON.parse(snapshot) as DbSchema
    persist()
    throw error
  }
}

export function resetDb(): void {
  if (!fixturesFactory) throw new Error('Fixtures não registradas')
  cache = fixturesFactory()
  persist()
}

export function loadFixtures(fixtures: DbSchema): void {
  setDb(fixtures)
}

/** Garante que exista um banco válido: reaproveita o persistido ou semeia as fixtures. */
export function ensureDbInitialized(): DbSchema {
  return getDbRaw()
}

/** Id determinístico e legível, derivado de um contador persistido no próprio banco. */
export function generateId(prefix: string): string {
  const db = getDbRaw()
  db.seq += 1
  persist()
  return `${prefix}_${String(db.seq).padStart(6, '0')}`
}

/** Hash estável (chaves ordenadas em todos os níveis) do conteúdo; usado para idempotência. */
export function stableHash(value: unknown): string {
  return sha256Hex(stableStringify(value))
}

/** Próxima versão monotônica do recurso (ex.: "nft:nft_01"). */
export function nextVersion(resourceKey: string): number {
  const db = getDbRaw()
  const next = (db.versions[resourceKey] ?? 0) + 1
  db.versions[resourceKey] = next
  persist()
  return next
}

export function getVersion(resourceKey: string): number {
  return getDbRaw().versions[resourceKey] ?? 0
}

export function markScenarioActivated(scenarioId: string): void {
  dbUpdate((d) => {
    d.scenarioMarks = d.scenarioMarks.filter((m) => m.scenarioId !== scenarioId)
    d.scenarioMarks.push({ scenarioId: scenarioId as DbSchema['scenarioMarks'][number]['scenarioId'], activatedAt: mockNow().toISOString() })
  })
}

export function getScenarioMark(scenarioId: string): string | null {
  const mark = getDbRaw().scenarioMarks.find((m) => m.scenarioId === scenarioId)
  return mark ? mark.activatedAt : null
}

export function clearScenarioMarks(): void {
  dbUpdate((d) => {
    d.scenarioMarks = []
  })
}

export function advanceClock(ms: number): void {
  dbUpdate((d) => {
    d.clock.offsetMs += ms
  })
}

export function setClockOffset(ms: number): void {
  dbUpdate((d) => {
    d.clock.offsetMs = ms
  })
}

/** Relógio simulado: tempo real + deslocamento controlável pelos testes. */
export function mockNow(): Date {
  return new Date(Date.now() + getDbRaw().clock.offsetMs)
}
