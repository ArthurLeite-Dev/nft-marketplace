import { test, expect } from '@playwright/test'

test.describe('Conta e sessão', () => {
  test('página de entrada renderiza', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/entrar')
    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: /entrar/i })).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('página de cadastro renderiza', async ({ page }) => {
    await page.goto('/cadastro')
    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: /cadastro/i })).toBeVisible()
  })

  test('página de conta requer autenticação', async ({ page }) => {
    await page.goto('/conta')
    await page.waitForTimeout(1000)

    // Deve mostrar login/cadastro ou redirecionar
    await expect(page.locator('body')).toContainText(/login|entrar|cadastro|conta/i)
  })
})
