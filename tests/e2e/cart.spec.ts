import { test, expect } from '@playwright/test'

test.describe('Carrinho', () => {
  test('página de carrinho renderiza sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/carrinho')
    await page.waitForTimeout(1000)

    // Deve carregar sem erros
    await expect(page.locator('body')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
