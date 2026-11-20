import { setupWorker, type StartOptions } from 'msw/browser'
import type { RequestHandler } from 'msw'
import { restHandlers } from './handlers'
import { ensureDbInitialized, registerFixtures } from './db/store'
import { createFixturesDb } from './fixtures'
import { installMockControl, syncScenarioFromUrl } from './control'
import { settleDueOrders } from './domain/checkout'

let started = false

/**
 * Liga a camada de mocks (REST + Socket.IO) no navegador.
 *
 * - O banco é semeado UMA vez e persistido: refresh mantém sessão, carrinho e pedidos.
 *   `window.__mock.reset()` restaura integralmente o cenário conhecido.
 * - `?scenario=<id>` na URL ativa um cenário e o persiste (sobrevive à navegação interna).
 */
export async function startMocking(opts?: StartOptions) {
  if (started) return
  started = true

  registerFixtures(createFixturesDb)
  ensureDbInitialized()
  syncScenarioFromUrl(window.location.search)
  installMockControl()

  const handlers: RequestHandler[] = [...restHandlers]
  try {
    // Carregado dinamicamente: a falha do servidor Socket.IO simulado não derruba o REST.
    const { realtimeHandlers } = await import('./realtime/socket-server')
    handlers.push(...realtimeHandlers)
  } catch (error) {
    console.error('[mocks] servidor Socket.IO simulado indisponível; seguindo só com REST', error)
  }

  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true, ...opts })

  // Liquida pedidos vencidos (relógio simulado) e dispara order.updated pelo Socket.IO simulado.
  window.setInterval(() => {
    settleDueOrders()
  }, 500)
}
