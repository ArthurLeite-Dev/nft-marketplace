import { test, expect } from '@playwright/test'

test.describe('Catálogo - busca, filtros, ordenação e paginação', () => {
  test('renderiza lista de NFTs e permite navegação por paginação', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForTimeout(1000)

    // Deve mostrar NFTs
    const articles = page.locator('article')
    expect(await articles.count()).toBeGreaterThan(0)

    // Paginação
    const nextButton = page.getByRole('button', { name: /próxima/i })
    await expect(nextButton).toBeVisible()
    await nextButton.click()
    await expect(page).toHaveURL(/page=2/)
    await expect(articles.first()).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('input de busca é interativo', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    const inputs = page.locator('input')
    expect(await inputs.count()).toBeGreaterThan(0)
  })
})
