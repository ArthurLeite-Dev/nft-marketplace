import { expect, type Page } from '@playwright/test'

export const ANA = { email: 'ana@jungle.test', password: 'Colecao@2026' }
export const BRUNO = { email: 'bruno@jungle.test', password: 'Galeria@2026' }

/**
 * Controle do servidor simulado (window.__mock, instalado por src/mocks/browser.ts).
 * Todo teste começa de um contexto novo (localStorage vazio) e, portanto, do cenário conhecido das fixtures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockApi = Record<string, (...args: any[]) => unknown>

export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => Boolean((window as unknown as { __mock?: unknown }).__mock))
}

/** Abre uma rota (opcionalmente com um cenário) e espera os mocks ficarem prontos. */
export async function openApp(page: Page, path = '/', scenario?: string) {
  const url = scenario ? `${path}${path.includes('?') ? '&' : '?'}scenario=${scenario}` : path
  await page.goto(url)
  await waitForMocks(page)
}

export async function mock<T = unknown>(page: Page, method: string, ...params: unknown[]): Promise<T> {
  await waitForMocks(page)
  return page.evaluate(
    ({ method, params }) => ((window as unknown as { __mock: MockApi }).__mock[method] as (...a: unknown[]) => unknown)(...params),
    { method, params },
  ) as Promise<T>
}

export async function login(page: Page, creds = ANA, redirect?: string) {
  await openApp(page, `/entrar${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`)
  await page.getByLabel('E-mail').fill(creds.email)
  await page.getByLabel('Senha').fill(creds.password)
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
}

export async function loginAndWait(page: Page, creds = ANA) {
  await login(page, creds)
  await expect(page).not.toHaveURL(/\/entrar/)
}

export async function addToCart(page: Page, nftId = 'nft_07') {
  await page.goto(`/nft/${nftId}`)
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho' })
  await expect(add).toBeEnabled()
  await add.click()
  await expect(page.getByText(/adicionado ao carrinho/i).first()).toBeAttached()
}

/** Do carrinho ao pedido enviado (carteira conectada, revisão e confirmação). */
export async function checkoutUntilReview(page: Page) {
  await page.goto('/carrinho')
  await page.getByRole('button', { name: 'Finalizar compra' }).click()
  await expect(page).toHaveURL(/\/pagamento/)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conectada via/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar pedido' })).toBeEnabled()
}

export async function confirmOrder(page: Page) {
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Confirmar compra|Tentar novamente/ }).click()
}

/** Estados de rolagem horizontal indevida (zoom/viewport estreito). */
export async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
}
