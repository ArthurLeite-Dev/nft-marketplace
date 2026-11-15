import { test, expect } from '@playwright/test'

test.describe('App Shell & Accessibility Baseline', () => {
  test('renders home shell cleanly without console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')

    // Title should be set
    await expect(page).toHaveTitle(/NFT Marketplace/)

    // Header and navigation should be visible
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Main content area exists and has id main-content
    const main = page.locator('#main-content')
    await expect(main).toBeVisible()

    // Footer is visible
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Skip link exists
    const skipLink = page.getByRole('link', { name: /pular para o conteúdo/i })
    await expect(skipLink).toHaveAttribute('href', '#main-content')

    // Live regions exist
    const politeLiveRegion = page.getByTestId('live-region-polite')
    await expect(politeLiveRegion).toHaveAttribute('aria-live', 'polite')

    expect(consoleErrors).toEqual([])
  })

  test('handles unknown routes with accessible 404 page', async ({ page }) => {
    await page.goto('/rota-completamente-inexistente-123')

    const notFoundHeading = page.getByRole('heading', { name: /404/i })
    await expect(notFoundHeading).toBeVisible()

    const backButton = page.getByRole('button', { name: /voltar ao início/i })
    await expect(backButton).toBeVisible()
  })
})
