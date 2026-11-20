import { test, expect } from '@playwright/test'
import { addToCart, hasHorizontalOverflow, loginAndWait, openApp } from './helpers'

for (const width of [390, 768, 1440]) {
  test.describe(`Responsividade ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('páginas públicas sem overflow horizontal', async ({ page }) => {
      for (const path of ['/', '/nft/nft_07', '/entrar', '/cadastro', '/carrinho']) {
        await openApp(page, path)
        await page.waitForLoadState('networkidle')
        expect(await hasHorizontalOverflow(page), `${path} @${width}`).toBe(false)
      }
    })

    test('fluxos privados sem overflow horizontal (pagamento, confirmação, conta)', async ({ page }) => {
      await loginAndWait(page)
      await addToCart(page)
      for (const path of ['/pagamento', '/conta', '/conta/perfil', '/conta/carteiras', '/conta/favoritos']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        expect(await hasHorizontalOverflow(page), `${path} @${width}`).toBe(false)
      }
    })
  })
}
