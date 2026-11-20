import { test, expect } from '@playwright/test'
import { addToCart, checkoutUntilReview, loginAndWait, openApp } from './helpers'

/**
 * Regressão visual de início, detalhe, carrinho e pagamento, com dados estáveis (cenário padrão,
 * fixtures determinísticas, movimento reduzido). Os baselines são versionados em
 * tests/e2e/visual.spec.ts-snapshots/ e gerados com `npm run test:visual:update`.
 */
test.use({ reducedMotion: 'reduce' })

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await openApp(page, '/')
    await expect(page.getByRole('article').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe do NFT', async ({ page }) => {
    await openApp(page, '/nft/nft_07')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await openApp(page, '/')
    await addToCart(page, 'nft_07')
    await page.goto('/carrinho')
    await expect(page.getByRole('button', { name: 'Remover item' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await loginAndWait(page)
    await addToCart(page, 'nft_07')
    await checkoutUntilReview(page)
    await expect(page.getByText(/Taxa de rede/)).toBeVisible()
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
