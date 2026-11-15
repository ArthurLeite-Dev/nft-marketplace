import type { ScenarioId, ScenarioEffect } from './scenarios'
import { createScenarioEffect, DEFAULT_SCENARIO, isScenarioId } from './scenarios'
import { ensureDbInitialized, getScenarioMark, advanceClock, setClockOffset, mockNow, markScenarioActivated } from './db/store'

const SCENARIO_STORAGE_KEY = 'jungle-mock-scenario'

const scenarioEffects = new Map<ScenarioId, ScenarioEffect>()

export function getEffect(scenarioId: ScenarioId): ScenarioEffect {
  let effect = scenarioEffects.get(scenarioId)
  if (!effect) {
    effect = createScenarioEffect(scenarioId)
    scenarioEffects.set(scenarioId, effect)
  }
  return effect
}

export { isScenarioId }

export function getActiveScenario(): ScenarioId {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(SCENARIO_STORAGE_KEY)
    if (stored && isScenarioId(stored)) return stored
  }
  if (typeof location !== 'undefined') {
    const urlParam = new URLSearchParams(location.search).get('scenario')
    if (urlParam && isScenarioId(urlParam)) return urlParam
  }
  return DEFAULT_SCENARIO
}

export interface MockControl {
  reset: () => void
  setScenario: (scenarioId: ScenarioId) => void
  getScenario: () => ScenarioId
  advanceClock: (ms: number) => void
  setClockOffset: (ms: number) => void
  now: () => Date
  updateNft: (nftId: string, patch: Partial<{ priceEth: string; previousPriceEth: string }>) => void
  disconnectWallet: () => void
}

export function installMockControl(): MockControl {
  ensureDbInitialized()

  let currentScenario: ScenarioId = getActiveScenario()
  const effect = getEffect(currentScenario)
  effect.active = true
  effect.activatedAt = getScenarioMark(currentScenario) ?? new Date().toISOString()
  markScenarioActivated(currentScenario)

  const control: MockControl = {
    reset() {
      for (const eff of scenarioEffects.values()) {
        eff.active = false
        eff.activatedAt = null
        eff.flakyAttempt = 0
      }
      setClockOffset(0)
      localStorage.removeItem(SCENARIO_STORAGE_KEY)
      if (typeof location !== 'undefined') location.reload()
    },
    setScenario(scenarioId: ScenarioId) {
      if (!isScenarioId(scenarioId)) return
      const prev = getEffect(currentScenario)
      prev.active = false
      prev.activatedAt = null
      currentScenario = scenarioId
      localStorage.setItem(SCENARIO_STORAGE_KEY, currentScenario)
      const next = getEffect(currentScenario)
      next.active = true
      next.activatedAt = new Date().toISOString()
      markScenarioActivated(currentScenario)
      if (typeof location !== 'undefined') {
        const url = new URL(location.href)
        url.searchParams.set('scenario', currentScenario)
        history.replaceState(null, '', url.toString())
      }
    },
    getScenario() {
      return currentScenario
    },
    advanceClock(ms) {
      advanceClock(ms)
    },
    setClockOffset(ms) {
      setClockOffset(ms)
    },
    now() {
      return mockNow()
    },
    updateNft(nftId, patch) {
      void nftId
      void patch
    },
    disconnectWallet() {
      // Implementado via domínio/handlers em T06/T07
    },
  }

  if (typeof window !== 'undefined') {
    ;(window as unknown as { __mock?: MockControl }).__mock = control
  }

  return control
}

export function getMockControl(): MockControl | undefined {
  return (window as unknown as { __mock?: MockControl }).__mock
}

export function isRealtimeOnline(): boolean {
  return true
}
