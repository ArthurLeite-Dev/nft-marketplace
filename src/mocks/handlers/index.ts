import { http, HttpResponse, delay } from 'msw'
import type { RequestHandler } from 'msw'
import { handleApi } from '../api'
import { getActiveScenario, getEffect } from '../control'
import { planNetwork } from '../respond'

/**
 * Adaptador MSW -> servidor simulado.
 *
 * Toda a regra de negócio vive em `handleApi` (função pura e testada). Aqui ficam só as
 * preocupações de transporte: latência, falha de conexão e erros HTTP de rede (cenários), além de
 * converter Request/Response. Não há respostas fictícias nem caminhos alternativos no cliente.
 */
export const restHandlers: RequestHandler[] = [
  http.all('/api/v1/*', async ({ request }) => {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api\/v1/, '') || '/'
    const scenario = getActiveScenario()

    const plan = planNetwork(getEffect(scenario), `${request.method} ${path}`)
    await delay(plan.delayMs)
    if (plan.kind === 'network-error') return HttpResponse.error()
    if (plan.kind === 'http-error') {
      return HttpResponse.json({ error: { code: plan.code, message: plan.message, retryable: true } }, { status: plan.status })
    }

    let body: unknown
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.json()
      } catch {
        body = undefined
      }
    }
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    const result = handleApi({ method: request.method, path, query: url.searchParams, headers, body, scenario })
    // Cenário order-timeout: o servidor processou, mas a resposta se perde (erro de rede no cliente).
    if (result.lostResponse) return HttpResponse.error()
    if (result.body === undefined) return new HttpResponse(null, { status: result.status })
    return HttpResponse.json(result.body, { status: result.status })
  }),
]
