import { test, expect } from '@playwright/test'

test.describe('Detalhe do NFT', () => {
  test('carrega página de detalhe de um NFT existente sem erros', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/nft/nft_01')
    await page.waitForTimeout(1000)

    // Deve carregar a página sem erros de console
    await expect(page.locator('body')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('NFT inexistente mostra página de erro', async ({ page }) => {
    await page.goto('/nft/inexistente-123')
    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: /não encontrado/i })).toBeVisible()
  })
})
