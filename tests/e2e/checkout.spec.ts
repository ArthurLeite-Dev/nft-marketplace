import { test, expect } from '@playwright/test'

test.describe('Pagamento', () => {
  test('página de pagamento renderiza sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/pagamento')
    await page.waitForTimeout(1000)

    await expect(page.locator('body')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
