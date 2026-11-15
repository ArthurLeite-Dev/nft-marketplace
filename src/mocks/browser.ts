import { setupWorker, type StartOptions } from 'msw/browser'
import { restHandlers } from './handlers'
import { loadFixtures } from './db/store'
import { createFixturesDb } from './fixtures'

let started = false

export async function startMocking(opts?: StartOptions) {
  if (started) return
  started = true

  const worker = setupWorker(...restHandlers)

  await loadFixtures(createFixturesDb())
  await worker.start(opts)
}
